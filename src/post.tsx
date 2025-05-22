import { Context } from "hono";
import { raw } from "hono/html";
import { and, desc, eq, gt, inArray, ne, sql, count, lte, asc, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, Thread, User, Props } from "./base";
import { Auth, Config, Pagination, HTMLFilter, HTMLText, IsAdmin } from "./core";
import { mAdd, mDel } from "./message";
import { cookieReset, lastPostTime } from "./user";
import { PEdit } from "../render/PEdit";
import { PList } from "../render/PList";

export interface PEditProps extends Props {
    eid: number,
    content: string,
}

export interface PListProps extends Props {
    thread: typeof Thread.$inferSelect
    page: number
    pagination: number[]
    data: (typeof Post.$inferSelect & {
        name: string | null;
        credits: number | null;
        gid: number | null;
        quote_content: string | null;
        quote_name: string | null;
    })[]
}

export async function pEdit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const time = Math.floor(Date.now() / 1000)
    const eid = parseInt(a.req.param('eid') ?? '0')
    let title = ""
    let content = ''
    if (eid < 0) {
        title = "编辑"
        const post = (await DB(a)
            .select()
            .from(Post)
            .where(and(
                eq(Post.pid, -eid),
                eq(Post.access, 0),
                IsAdmin(i, undefined, eq(Post.uid, i.uid)), // 管理和作者都能编辑
                IsAdmin(i, undefined, gt(sql`${Post.time} + 604800`, time)), // 7天后禁止编辑
            ))
        )?.[0]
        if (!post) { return a.text('403', 403) }
        content = raw(post.content) ?? ''
    } else if (eid > 0) {
        title = "回复"
    } else {
        title = "发表"
    }
    const edit_forbid = true;
    return a.html(PEdit(a, { i, title, eid, content, edit_forbid }));
}

export async function pSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const time = Math.floor(Date.now() / 1000)
    const body = await a.req.formData()
    const eid = parseInt(a.req.param('eid') ?? '0')
    const raw = body.get('content')?.toString() ?? ''
    if (eid < 0) { // 编辑
        const content = await HTMLFilter(raw)
        if (!content) { return a.text('406', 406) }
        const subject = await HTMLText(raw, 140, true)
        const post = (await DB(a)
            .update(Post)
            .set({
                content: content,
            })
            .where(and(
                eq(Post.pid, -eid),
                eq(Post.access, 0),
                IsAdmin(i, undefined, eq(Post.uid, i.uid)), // 管理和作者都能编辑
                IsAdmin(i, undefined, gt(sql`${Post.time} + 604800`, time)), // 7天后禁止编辑
            ))
            .returning()
        )?.[0]
        if (!post) { return a.text('403', 403) }
        if (post.pid == post.tid) {
            await DB(a)
                .update(Thread)
                .set({
                    subject,
                })
                .where(eq(Thread.tid, post.tid))
        }
        return a.text('ok')
    } else if (eid > 0) { // 回复
        if (time - lastPostTime(i.uid) < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        const quote = (await DB(a)
            .select()
            .from(Post)
            .where(and(
                eq(Post.pid, eid),
                eq(Post.access, 0),
            ))
        )?.[0]
        if (!quote) { return a.text('403', 403) }
        const content = await HTMLFilter(raw)
        if (!content) { return a.text('406', 406) }
        const thread = (await DB(a)
            .update(Thread)
            .set({
                posts: sql`${Thread.posts}+1`,
                last_uid: i.uid,
                last_time: time,
            })
            .where(and(
                eq(Thread.tid, quote.tid),
                gt(sql`${Thread.last_time} + 604800`, time), // 7天后禁止回复
            ))
            .returning()
        )?.[0]
        // 帖子找不到 一周没有热度 禁止回复
        if (!thread) { return a.text('403', 403) }
        const post = (await DB(a)
            .insert(Post)
            .values({
                tid: quote.tid,
                uid: i.uid,
                time,
                quote_pid: quote.pid,
                content,
            })
            .returning()
        )?.[0]
        await DB(a)
            .update(User)
            .set({
                posts: sql`${User.posts} + 1`,
                credits: sql`${User.credits} + 1`,
                golds: sql`${User.golds} + 1`,
            })
            .where(eq(User.uid, post.uid))
        // 回复通知开始 如果回复的不是自己
        if (post.uid != quote.uid) {
            await mAdd(a, quote.uid, 1, post.pid)
        }
        // 回复通知结束
        lastPostTime(i.uid, time) // 记录发帖时间
        cookieReset(i.uid, true) // 刷新自己的COOKIE
        return a.text('ok') //! 返回tid/pid和posts数量
    } else { // 发帖
        if (time - lastPostTime(i.uid) < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        const content = await HTMLFilter(raw)
        if (!content) { return a.text('406', 406) }
        const subject = await HTMLText(raw, 140, true)
        const post = (await DB(a)
            .insert(Post)
            .values({
                uid: i.uid,
                time,
                content,
            })
            .returning()
        )?.[0]
        post.tid = post.pid
        await DB(a)
            .update(Post)
            .set({
                tid: post.tid,
            })
            .where(eq(Post.pid, post.pid))
        await DB(a)
            .insert(Thread)
            .values({
                tid: post.tid,
                uid: i.uid,
                subject,
                time,
                last_time: time,
                posts: 1,
            })
        await DB(a)
            .update(User)
            .set({
                threads: sql`${User.threads} + 1`,
                posts: sql`${User.posts} + 1`,
                credits: sql`${User.credits} + 2`,
                golds: sql`${User.golds} + 2`,
            })
            .where(eq(User.uid, i.uid))
        await Config.set(a, 'threads', (await Config.get<number>(a, 'threads') || 0) + 1)
        lastPostTime(i.uid, time) // 记录发帖时间
        cookieReset(i.uid, true) // 刷新自己的COOKIE
        return a.text(String(post.pid))
    }
}

export async function pOmit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const pid = -parseInt(a.req.param('eid') ?? '0')
    const post = (await DB(a)
        .update(Post)
        .set({
            access: 3,
        })
        .where(and(
            eq(Post.pid, pid),
            IsAdmin(i, undefined, eq(Post.uid, i.uid)), // 管理和作者都能删除
        ))
        .returning()
    )?.[0]
    // 如果无法删除则报错
    if (!post) { return a.text('410:gone', 410) }
    if (post.pid == post.tid) {
        // 如果删的是Thread
        await DB(a)
            .update(Thread)
            .set({
                access: 3,
            })
            .where(and(
                eq(Thread.tid, post.tid),
                IsAdmin(i, undefined, eq(Thread.uid, i.uid)), // 管理和作者都能删除
            ))
        await DB(a)
            .update(User)
            .set({
                threads: sql`${User.threads} - 1`,
                posts: sql`${User.posts} - 1`,
                credits: sql`${User.credits} - 2`,
                golds: sql`${User.golds} - 2`,
            })
            .where(eq(User.uid, post.uid))
        await Config.set(a, 'threads', (await Config.get<number>(a, 'threads') || 0) - 1)
        // 回复通知开始
        const QuotePost = alias(Post, 'QuotePost')
        // 向被引用人发送了回复通知的帖子
        const postArr = await DB(a)
            .select({
                pid: Post.pid,
                time: Post.time,
                quote_uid: QuotePost.uid,
            })
            .from(Post)
            .where(and(
                inArray(Post.access, [0, 1, 2, 3]),
                eq(Post.tid, post.tid),
                ne(Post.uid, QuotePost.uid),
            ))
            .leftJoin(QuotePost, eq(QuotePost.pid, Post.quote_pid))
        postArr.forEach(async function (post) {
            if (post.quote_uid) {
                // 未读 已读 消息都删
                await mDel(a, post.quote_uid, [-1, 1], post.pid)
            }
        })
        // 回复通知结束
    } else {
        // 如果删的是Post
        const last = (await DB(a)
            .select()
            .from(Post)
            .where(and(
                // access
                eq(Post.access, 0),
                // tid
                eq(Post.tid, post.tid),
            ))
            .orderBy(desc(Post.access), desc(Post.tid), desc(Post.pid))
            .limit(1)
        )?.[0]
        await DB(a)
            .update(Thread)
            .set({
                posts: sql`${Thread.posts} - 1`,
                last_uid: (last.pid == last.tid) ? 0 : last.uid, // 仅剩顶楼时没有最后回复
                last_time: last.time,
            })
            .where(eq(Thread.tid, post.tid))
        await DB(a)
            .update(User)
            .set({
                posts: sql`${User.posts} - 1`,
                credits: sql`${User.credits} - 1`,
                golds: sql`${User.golds} - 1`,
            })
            .where(eq(User.uid, post.uid))
        // 回复通知开始
        const quote = (await DB(a)
            .select()
            .from(Post)
            .where(eq(Post.pid, post.quote_pid))
        )?.[0]
        // 如果存在被回复帖 且回复的不是自己
        if (quote && post.uid != quote.uid) {
            // 未读 已读 消息都删
            await mDel(a, quote.uid, [-1, 1], post.pid)
        }
        // 回复通知结束
    }
    return a.text('ok')
}

export async function pList(a: Context) {
    const i = await Auth(a)
    const tid = parseInt(a.req.param('tid'))
    const thread = (await DB(a)
        .select()
        .from(Thread)
        .where(and(
            eq(Thread.tid, tid),
            eq(Thread.access, 0),
        ))
    )?.[0]
    if (!thread) { return a.notFound() }
    const page = parseInt(a.req.param('page') ?? '0') || 1
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const QuotePost = alias(Post, 'QuotePost')
    const QuoteUser = alias(User, 'QuoteUser')
    const data = await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            credits: User.credits,
            gid: User.gid,
            quote_content: QuotePost.content,
            quote_name: QuoteUser.name,
        })
        .from(Post)
        .where(and(
            // access
            eq(Post.access, 0),
            // tid
            eq(Post.tid, tid),
        ))
        .leftJoin(User, eq(Post.uid, User.uid))
        .leftJoin(QuotePost, and(ne(Post.quote_pid, Post.tid), eq(QuotePost.pid, Post.quote_pid), eq(QuotePost.access, 0)))
        .leftJoin(QuoteUser, eq(QuoteUser.uid, QuotePost.uid))
        .orderBy(asc(Post.access), asc(Post.tid), asc(Post.pid))
        .offset((page - 1) * page_size_p)
        .limit(page_size_p)
    const pagination = Pagination(page_size_p, thread.posts, page, 2)
    const title = thread.subject
    const edit_forbid = (thread.last_time + 604800) < Math.floor(Date.now() / 1000)
    return a.html(PList(a, { i, thread, page, pagination, data, title, edit_forbid }))
}

export async function pJump(a: Context) {
    const tid = parseInt(a.req.query('tid') ?? '0')
    const pid = parseInt(a.req.query('pid') ?? '0')
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = (await DB(a)
        .select({ count: count() })
        .from(Post)
        .where(and(
            // access
            eq(Post.access, 0),
            // tid
            eq(Post.tid, tid),
            // pid
            lte(Post.pid, pid),
        ))
        .orderBy(asc(Post.access), asc(Post.tid), asc(Post.pid))
    )?.[0]
    const page = Math.ceil(data.count / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + pid, 301)
}

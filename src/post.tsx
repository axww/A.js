import { Context } from "hono";
import { raw } from "hono/html";
import { and, desc, eq, gt, inArray, ne, sql, count, lte, asc, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User, Props, Meta } from "./base";
import { Auth, Config, Pagination, HTMLFilter, HTMLText } from "./core";
import { PEdit } from "../render/PEdit";
import { PList } from "../render/PList";

export interface PEditProps extends Props {
    eid: number,
    content: string,
}

export interface PListProps extends Props {
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
    if (i.gid <= -2) { return a.text('403', 403) } // 禁言用户
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
                inArray(Post.type, [0, 1]), // 已删除的内容不能编辑
                (i.gid >= 3) ? undefined : eq(Post.uid, i.uid), // 站长和作者都能编辑
                (i.gid >= 3) ? undefined : gt(sql<number>`${Post.time} + 604800`, a.get('time')), // 7天后禁止编辑
            ))
        )?.[0]
        if (!post) { return a.text('403', 403) }
        content = raw(post.content) ?? ''
    } else {
        title = "发帖"
    }
    const thread_lock = true;
    return a.html(PEdit(a, { i, title, eid, content, thread_lock }));
}

export async function pSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    if (i.gid <= -2) { return a.text('403', 403) } // 禁言用户
    const body = await a.req.formData()
    const eid = parseInt(a.req.param('eid') ?? '0')
    const raw = body.get('content')?.toString() ?? ''
    if (eid < 0) { // 编辑
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const post = (await DB(a)
            .update(Post)
            .set({
                content: content,
            })
            .where(and(
                eq(Post.pid, -eid),
                inArray(Post.type, [0, 1]), // 已删除的内容不能编辑
                (i.gid >= 3) ? undefined : eq(Post.uid, i.uid), // 站长和作者都能编辑
                (i.gid >= 3) ? undefined : gt(sql<number>`${Post.time} + 604800`, a.get('time')), // 7天后禁止编辑
            ))
            .returning({ pid: Post.pid })
        )?.[0]
        if (!post.pid) { return a.text('403', 403) }
        return a.text('ok')
    } else if (eid > 0) { // 回复
        if (a.get('time') - i.last_post < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.gid == -1 && a.get('time') - i.last_post < 43200) { return a.text('ad_limit_day', 403) } // 广告用户
        const Thread = alias(Post, 'Thread')
        const quote = (await DB(a)
            .select({
                pid: Post.pid,
                uid: Post.uid,
                tid: Thread.pid,
                sort_time: Thread.sort_time,
            })
            .from(Post)
            .where(and(
                eq(Post.pid, eid),
                inArray(Post.type, [0, 1]), // 已删除的内容不能回复
            ))
            .leftJoin(Thread, eq(Thread.pid, sql<number>`CASE WHEN ${Post.tid} = 0 THEN ${Post.pid} ELSE ${Post.tid} END`))
        )?.[0]
        if (!quote || quote.tid === null || quote.sort_time === null) { return a.text('not_found', 403) } // 被回复帖子或主题不存在
        if (a.get('time') > quote.sort_time + 604800) { return a.text('too_old', 429) } // 7天后禁止回复
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const res = (await DB(a).batch([
            DB(a)
                .insert(Post)
                .values({
                    tid: quote.tid,
                    uid: i.uid,
                    time: a.get('time'),
                    sort_time: a.get('time'),
                    quote_uid: (i.uid != quote.uid) ? quote.uid : -quote.uid, // 如果回复的是自己则隐藏
                    relate_id: quote.pid,
                    content,
                })
                .returning({ pid: Post.pid })
            ,
            DB(a)
                .update(Post)
                .set({
                    sort_time: a.get('time'),
                    relate_id: i.uid,
                })
                .where(eq(Post.pid, quote.tid))
            ,
            DB(a)
                .insert(Meta)
                .values([
                    { uid_tid: quote.tid, count: 1 },
                ])
                .onConflictDoUpdate({
                    target: Meta.uid_tid,
                    set: { count: sql<number>`${Meta.count} + 1` }
                })
            ,
            DB(a)
                .update(User)
                .set({
                    credits: sql<number>`${User.credits} + 1`,
                    golds: sql<number>`${User.golds} + 1`,
                    last_post: a.get('time'),
                })
                .where(eq(User.uid, i.uid))
            ,
        ]))[0][0]
        if (!res.pid) { return a.text('db execute failed', 403) }
        return a.text('ok') //! 返回tid/pid和posts数量
    } else { // 发帖
        if (a.get('time') - i.last_post < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.gid == -1 && a.get('time') - i.last_post < 432000) { return a.text('ad_limit_week', 403) } // 广告用户
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const res = (await DB(a).batch([
            DB(a)
                .insert(Post)
                .values({
                    uid: i.uid,
                    time: a.get('time'),
                    sort_time: a.get('time'),
                    content,
                }).returning({ pid: Post.pid })
            ,
            DB(a)
                .insert(Meta)
                .values([
                    { uid_tid: -i.uid, count: 1 },
                    { uid_tid: 0, count: 1 },
                ])
                .onConflictDoUpdate({
                    target: Meta.uid_tid,
                    set: { count: sql<number>`${Meta.count} + 1` }
                })
            ,
            DB(a)
                .update(User)
                .set({
                    credits: sql<number>`${User.credits} + 2`,
                    golds: sql<number>`${User.golds} + 2`,
                    last_post: a.get('time'),
                })
                .where(eq(User.uid, i.uid))
            ,
        ]))[0][0]
        if (!res.pid) { return a.text('db execute failed', 403) }
        return a.text(String(res.pid))
    }
}

export async function pOmit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const pid = -parseInt(a.req.param('eid') ?? '0')
    // 被删的帖子
    const post = (await DB(a)
        .select({
            pid: Post.pid,
            uid: Post.uid,
            tid: Post.tid,
            relate_id: Post.relate_id,
        })
        .from(Post)
        .where(and(
            eq(Post.pid, pid),
            (i.gid >= 2) ? undefined : eq(Post.uid, i.uid), // 管理和作者都能删除
        ))
    )?.[0]
    // 如果无权限或帖子不存在则报错
    if (!post) { return a.text('410:gone', 410) }
    if (!post.tid) {
        // 如果删的是Thread
        await DB(a).batch([
            DB(a)
                .update(Post)
                .set({
                    type: 3, // 主题自身被删 类型改为3
                })
                .where(eq(Post.pid, post.pid))
            ,
            DB(a)
                .update(Post)
                .set({
                    type: 1, // 主题被删 公开回复 类型改为1
                })
                .where(and(
                    eq(Post.type, 0),
                    eq(Post.tid, post.pid),
                ))
            ,
            DB(a)
                .update(Meta)
                .set({
                    count: sql<number>`${Meta.count} - 1`,
                })
                .where(inArray(Meta.uid_tid, [-post.uid, 0]))
            ,
            DB(a)
                .update(User)
                .set({
                    credits: sql<number>`${User.credits} - 2`,
                    golds: sql<number>`${User.golds} - 2`,
                })
                .where(eq(User.uid, post.uid))
            ,
        ])
    } else {
        // 如果删的是Post 如果所有回复都删了会返回null
        const last = DB(a).$with('last').as(
            DB(a)
                .select({
                    uid: Post.uid,
                    time: Post.time,
                })
                .from(Post)
                .where(and(
                    // type
                    eq(Post.type, 0),
                    // tid
                    eq(Post.tid, post.tid),
                ))
                .orderBy(desc(Post.type), desc(Post.tid), desc(Post.time))
                .limit(1)
        )
        await DB(a).batch([
            DB(a)
                .update(Post)
                .set({
                    type: 3,
                })
                .where(eq(Post.pid, post.pid))
            ,
            DB(a)
                .with(last)
                .update(Post)
                .set({
                    sort_time: sql<number>`COALESCE((SELECT time FROM ${last}),${Post.time})`,
                    relate_id: sql<number>`(SELECT COALESCE(uid,0) FROM ${last})`,
                })
                .where(eq(Post.pid, post.tid)) // 更新thread
            ,
            DB(a)
                .update(Meta)
                .set({
                    count: sql<number>`${Meta.count} - 1`,
                })
                .where(eq(Meta.uid_tid, post.tid))
            ,
            DB(a)
                .update(User)
                .set({
                    credits: sql<number>`${User.credits} - 1`,
                    golds: sql<number>`${User.golds} - 1`,
                })
                .where(eq(User.uid, post.uid))
            ,
        ])
    }
    return a.text('ok')
}

export async function pList(a: Context) {
    const i = await Auth(a)
    const tid = parseInt(a.req.param('tid'))
    const QuotePost = alias(Post, 'QuotePost')
    const QuoteUser = alias(User, 'QuoteUser')
    const thread = (await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            credits: User.credits,
            gid: User.gid,
            quote_content: sql<string>`''`,
            quote_name: sql<string>`''`,
            count: Meta.count,
        })
        .from(Post)
        .where(and(
            eq(Post.pid, tid),
            inArray(Post.type, [0, 1]),
        ))
        .leftJoin(User, eq(Post.uid, User.uid))
        .leftJoin(Meta, eq(Meta.uid_tid, tid))
    )?.[0]
    if (!thread) { return a.notFound() }
    const page = parseInt(a.req.param('page') ?? '0') || 1
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = [thread, ...await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            credits: User.credits,
            gid: User.gid,
            quote_content: QuotePost.content,
            quote_name: QuoteUser.name,
            count: sql<number>`0`,
        })
        .from(Post)
        .where(and(
            eq(Post.type, 0),
            eq(Post.tid, tid),
        ))
        .leftJoin(User, eq(Post.uid, User.uid))
        .leftJoin(QuotePost, and(ne(Post.relate_id, Post.tid), eq(QuotePost.pid, Post.relate_id), inArray(QuotePost.type, [0, 1])))
        .leftJoin(QuoteUser, eq(QuoteUser.uid, QuotePost.uid))
        .orderBy(asc(Post.type), asc(Post.tid), asc(Post.time))
        .offset((page - 1) * page_size_p)
        .limit(page_size_p)
    ]
    const pagination = Pagination(page_size_p, thread.count ?? 0, page, 2)
    const title = await HTMLText(thread.content, 140, true)
    const thread_lock = a.get('time') > (thread.sort_time + 604800)
    return a.html(PList(a, { i, page, pagination, data, title, thread_lock }))
}

export async function pJump(a: Context) {
    const tid = parseInt(a.req.query('tid') ?? '0')
    const time = parseInt(a.req.query('time') ?? '0')
    if (!tid || !time) { return a.redirect('/') }
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = (await DB(a)
        .select({ count: count() })
        .from(Post)
        .where(and(
            // type
            eq(Post.type, 0),
            // tid
            eq(Post.tid, tid),
            // time
            lte(Post.time, time),
        ))
        .orderBy(asc(Post.type), asc(Post.tid), asc(Post.time))
    )?.[0]
    const page = Math.ceil(data.count / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + time, 301)
}

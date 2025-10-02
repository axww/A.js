import { Context } from "hono";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, HTMLFilter } from "./core";

export async function pSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    if (i.grade <= -2) { return a.text('403', 403) } // 禁言用户
    const eid = parseInt(a.req.param('eid') ?? '0')
    const body = await a.req.formData()
    const land = parseInt(body.get('land')?.toString() ?? '0')
    if (![1, 2, 3].includes(land)) { return a.text('illegal_land', 403) } // 是否在可选分区内
    const raw = body.get('content')?.toString() ?? ''
    if (eid < 0) { // 编辑
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const post = (await DB(a)
            .update(Post)
            .set({
                root_land: sql<number>`CASE WHEN ${Post.root_land} > 0 THEN ${land} ELSE ${Post.root_land} END`, // 回帖不能修改引用
                content: content,
            })
            .where(and(
                eq(Post.pid, -eid),
                inArray(Post.attr, [0, 1]), // 已删除的内容不能编辑
                (i.grade >= 3) ? undefined : eq(Post.user, i.uid), // 站长和作者都能编辑
                (i.grade >= 3) ? undefined : gt(sql<number>`${Post.date_time} + 604800`, a.get('time')), // 7天后禁止编辑
            ))
            .returning({ pid: Post.pid })
        )?.[0]
        if (!post.pid) { return a.text('403', 403) }
        return a.text('ok')
    } else if (eid > 0) { // 回复
        if (a.get('time') - i.last_post < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.grade == -1 && a.get('time') - i.last_post < 172800) { return a.text('ad_limit_2day', 403) } // 广告用户
        const Thread = alias(Post, 'Thread')
        const quote = (await DB(a)
            .select({
                pid: Post.pid,
                uid: Post.user,
                tid: Thread.pid,
                thread_root_land: Thread.root_land, // 引用所在Thread的root_land>0
                thread_show_time: Thread.show_time,
            })
            .from(Post)
            .where(and(
                eq(Post.pid, eid),
                inArray(Post.attr, [0, 1]), // 已删除的内容不能回复
            ))
            .leftJoin(Thread, eq(Thread.pid, sql<number>`CASE WHEN ${Post.root_land} > 0 THEN ${Post.pid} ELSE -${Post.root_land} END`))
        )?.[0]
        if (!quote || quote.pid === null) { return a.text('not_found', 403) } // 被回复帖子或主题不存在
        if ([1, 2].includes(quote.thread_root_land) && a.get('time') > quote.thread_show_time + 604800) { return a.text('too_old', 429) } // 无热度7天后关闭
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const res = (await DB(a).batch([
            DB(a)
                .insert(Post)
                .values({
                    user: i.uid,
                    refer_pid: quote.pid,
                    call_land: (i.uid != quote.uid) ? quote.uid : -quote.uid, // 如果回复的是自己则隐藏
                    show_time: a.get('time'),
                    root_land: -quote.tid,
                    date_time: a.get('time'),
                    content,
                })
                .returning({ pid: Post.pid })
            ,
            DB(a)
                .update(Post)
                .set({
                    refer_pid: sql<number>`LAST_INSERT_ROWID()`,
                    show_time: [1, 2].includes(quote.thread_root_land) ? a.get('time') : Post.show_time, // 回复后顶贴的分区
                })
                .where(eq(Post.pid, quote.tid))
            ,
            DB(a)
                .update(User)
                .set({
                    golds: sql<number>`${User.golds} + 1`,
                    credits: sql<number>`${User.credits} + 1`,
                    last_post: a.get('time'),
                })
                .where(eq(User.uid, i.uid))
            ,
        ]))[0][0]
        if (!res.pid) { return a.text('db execute failed', 403) }
        return a.text('ok') //! 返回tid/pid和posts数量
    } else { // 发帖
        if (a.get('time') - i.last_post < 60) { return a.text('too_fast', 403) } // 防止频繁发帖
        if (i.grade == -1 && a.get('time') - i.last_post < 604800) { return a.text('ad_limit_7day', 403) } // 广告用户
        const [content, length] = await HTMLFilter(raw)
        if (length < 3) { return a.text('content_short', 422) }
        const res = (await DB(a).batch([
            DB(a)
                .insert(Post)
                .values({
                    user: i.uid,
                    show_time: a.get('time'),
                    root_land: land,
                    date_time: a.get('time'),
                    content,
                }).returning({ pid: Post.pid })
            ,
            DB(a)
                .update(User)
                .set({
                    golds: sql<number>`${User.golds} + 2`,
                    credits: sql<number>`${User.credits} + 2`,
                    last_post: a.get('time'),
                })
                .where(eq(User.uid, i.uid))
            ,
        ]))[0][0]
        if (!res.pid) { return a.text('db execute failed', 403) }
        return a.text(String(res.pid))
    }
}

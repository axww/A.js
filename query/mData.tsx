import { Context } from "hono";
import { DB, Message, Post, User } from "../src/base";
import { Auth, HTMLText } from "../src/core";
import { mClear, mRead } from "./mCore";
import { alias } from "drizzle-orm/sqlite-core";
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';

export async function _mList(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const type = a.req.queries('type')?.map(Number).filter(n => !isNaN(n)) ?? [];
    const pid = parseInt(a.req.query('pid') ?? '0');
    const QuotePost = alias(Post, 'QuotePost')
    const data = await DB(a)
        .select({
            type: Message.type, // 添加消息类型字段，用于区分已读/未读
            quote_pid: QuotePost.pid,
            quote_content: QuotePost.content,
            post_uid: User.uid,
            post_name: User.name,
            post_pid: Post.pid,
            post_tid: Post.tid,
            post_time: Post.time,
            post_content: Post.content,
        })
        .from(Message)
        .where(and(
            eq(Message.uid, i.uid),
            inArray(Message.type, type),
            pid ? lt(Message.pid, pid) : undefined,
        ))
        .leftJoin(Post, eq(Post.pid, Message.pid))
        .leftJoin(User, eq(User.uid, Post.uid))
        .leftJoin(QuotePost, eq(QuotePost.pid, sql`CASE WHEN ${Post.quote_pid} = 0 THEN ${Post.tid} ELSE ${Post.quote_pid} END`))
        .orderBy(desc(Message.pid))
        .limit(10)
    data.forEach(async function (row) {
        row.quote_content = await HTMLText.all(row.quote_content, 300);
        row.post_content = await HTMLText.all(row.post_content, 300);
    })
    return a.json(data)
}

export async function _mClear(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    mClear(a, i.uid, 1);
    return a.json('ok')
}

// 标记单条消息为已读
export async function _mRead(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }

    const pid = parseInt(a.req.query('pid') ?? '0');
    if (!pid) { return a.json({ success: false, message: '无效的消息ID' }) }

    await mRead(a, i.uid, 1, pid);
    return a.json({ success: true });
}

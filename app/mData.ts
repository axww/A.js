import { Context } from "hono";
import { DB, Message, Post, User } from "./base";
import { Auth, HTMLText } from "./core";
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { mClear } from "./mCore";

export async function _mList(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const type = a.req.queries('type')?.map(Number).filter(n => !isNaN(n)) ?? [];
    const pid = parseInt(a.req.query('pid') ?? '0');
    const QuotePost = alias(Post, 'QuotePost')
    const data = await DB
        .select({
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
        .leftJoin(QuotePost, eq(QuotePost.pid, Post.quote_pid))
        .orderBy(desc(Message.pid))
        .limit(10)
    data.forEach(function (row) {
        row.quote_content = HTMLText.all(row.quote_content, 100);
        row.post_content = HTMLText.all(row.post_content, 200);
    })
    return a.json(data)
}

export async function _mClear(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    mClear(i.uid, 1);
    return a.json('ok')
}

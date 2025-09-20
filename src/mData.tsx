import { Context } from "hono";
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, HTMLText } from "./core";

export async function mData(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const sort = parseInt(a.req.query('sort') ?? '0')
    const QuotePost = alias(Post, 'QuotePost')
    const data = await DB(a)
        .select({
            post_pid: Post.pid,
            post_tid: sql`-${Post.land}`, // 因为Message都是Post 所以-land就是tid
            post_time: Post.time,
            post_content: Post.content,
            post_uid: User.uid,
            post_name: User.name,
            quote_pid: QuotePost.pid,
            quote_content: QuotePost.content,
        })
        .from(Post)
        .where(and(
            eq(Post.attr, 0),
            eq(Post.call, i.uid),
            sort ? lt(Post.sort, sort) : undefined,
        ))
        .leftJoin(User, eq(User.uid, Post.user))
        .leftJoin(QuotePost, eq(QuotePost.pid, Post.rpid))
        .orderBy(desc(Post.attr), desc(Post.call), desc(Post.sort))
        .limit(10)
    await Promise.all(data.map(async function (row: { quote_content: string | null | undefined; post_content: string | null | undefined; }) {
        row.quote_content = await HTMLText(row.quote_content, 300);
        row.post_content = await HTMLText(row.post_content, 300);
    }))
    return a.json(data)
}

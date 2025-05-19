import { Context } from "hono";
import { DB, Post } from "./base";
import { Config } from "./core";
import { asc, eq, or, and, count, lte } from 'drizzle-orm';

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
            // tid - pid
            or(
                and(eq(Post.tid, 0), eq(Post.pid, tid)),
                eq(Post.tid, tid),
            ),
            lte(Post.pid, pid),
        ))
        .orderBy(asc(Post.pid))
    )?.[0]
    const page = Math.ceil(data.count / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + pid, 301)
}

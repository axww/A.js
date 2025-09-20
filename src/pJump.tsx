import { Context } from "hono";
import { and, eq, count, lte, asc } from "drizzle-orm";
import { DB, Post } from "./base";
import { Config } from "./core";

export async function pJump(a: Context) {
    const tid = parseInt(a.req.query('tid') ?? '0')
    const time = parseInt(a.req.query('time') ?? '0')
    if (tid <= 0 || !time) { return a.redirect('/') }
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = (await DB(a)
        .select({ cross: count() })
        .from(Post)
        .where(and(
            // attr
            eq(Post.attr, 0),
            // land
            eq(Post.land, -tid),
            // time
            lte(Post.time, time),
        ))
        .orderBy(asc(Post.attr), asc(Post.land), asc(Post.time))
    )?.[0]
    const page = Math.ceil(data.cross / page_size_p)
    return a.redirect('/t/' + tid + '/' + page + '?' + time, 301)
}

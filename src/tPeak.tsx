import { Context } from "hono";
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { DB, Post } from "./base";
import { Auth } from "./core";

export async function tPeak(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const tid = parseInt(a.req.param('tid') ?? '0')
    const post = (await DB(a)
        .update(Post)
        .set({
            attr: sql<number>`CASE WHEN ${Post.attr} = 0 THEN 1 ELSE 0 END`,
        })
        .where(and(
            eq(Post.pid, tid),
            inArray(Post.attr, [0, 1]),
            gt(Post.land, 0), // 必须是Thread(land>0)
        ))
        .returning()
    )?.[0]
    // 如果无法置顶则报错
    if (!post) { return a.text('410:gone', 410) }
    return a.text('ok')
}

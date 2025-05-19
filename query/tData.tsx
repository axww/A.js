import { Context } from "hono";
import { DB, Thread } from "./base";
import { Auth } from "./core";
import { eq, sql } from "drizzle-orm";

export async function tPeak(a: Context) {
    const i = await Auth(a)
    if (!i || i.gid != 1) { return a.text('401', 401) }
    const tid = parseInt(a.req.param('tid') ?? '0')
    const post = (await DB(a)
        .update(Thread)
        .set({
            is_top: sql`CASE WHEN ${Thread.is_top} = 0 THEN 1 ELSE 0 END`,
        })
        .where(eq(Thread.tid, tid))
        .returning()
    )?.[0]
    // 如果无法置顶则报错
    if (!post) { return a.text('410:gone', 410) }
    return a.text('ok')
}

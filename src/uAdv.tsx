import { Context } from "hono";
import { and, eq, lt, sql } from "drizzle-orm";
import { DB, User } from "./base";
import { Auth } from "./core";

export async function uAdv(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const uid = parseInt(a.req.param('uid') ?? '0')
    const user = (await DB(a)
        .update(User)
        .set({
            grade: sql<number>`CASE WHEN ${User.grade} !=-1 THEN -1 ELSE 0 END`,
        })
        .where(and(
            eq(User.uid, uid),
            lt(User.grade, 1), // 无权封禁贵宾以上用户组
        ))
        .returning()
    )?.[0]
    // 如果无法标记则报错
    if (!user) { return a.text('410:gone', 410) }
    return a.text('ok')
}

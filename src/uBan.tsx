import { Context } from "hono";
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { DB, Post, User } from "./base";
import { Auth } from "./core";

export async function uBan(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const uid = parseInt(a.req.param('uid') ?? '0')
    const user = (await DB(a)
        .update(User)
        .set({
            grade: -2,
        })
        .where(and(
            eq(User.uid, uid),
            lt(User.grade, 1), // 无权封禁贵宾以上用户组
        ))
        .returning()
    )?.[0]
    // 如果无法标记则报错
    if (!user) { return a.text('410:gone', 410) }
    // 找出所有违规者帖子
    const topic = DB(a).$with('topic').as(
        DB(a)
            .select({ pid: Post.pid })
            .from(Post)
            .where(and(
                inArray(Post.attr, [0, 1]),
                eq(Post.user, uid),
                gt(Post.land, 0), // 必须是Thread(land>0)
            ))
    )
    // 删除违规者所有帖子和回复，以及他人的回复。with要在update之前，否则post改变后子查询失效。
    await DB(a).batch([
        DB(a)
            .with(topic)
            .update(Post)
            .set({
                attr: 1,
            })
            .where(and(
                eq(Post.attr, 0),
                inArray(Post.land, sql<number[]>`(SELECT -pid FROM ${topic})`), // 所有tid=pid=-land相反数
                ne(Post.user, uid),
            )) // 更新thread
        ,
        DB(a)
            .update(Post)
            .set({
                attr: 3,
            })
            .where(and(
                inArray(Post.attr, [0, 1]),
                eq(Post.user, uid),
            ))
        ,
    ])
    return a.text('ok')
}

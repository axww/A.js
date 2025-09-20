import { Context } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import { DB, Post, User } from "./base";
import { Auth } from "./core";

export async function pOmit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const pid = -parseInt(a.req.param('eid') ?? '0')
    // 被删的帖子
    const post = (await DB(a)
        .select({
            pid: Post.pid,
            user: Post.user,
            land: Post.land,
            rpid: Post.rpid,
        })
        .from(Post)
        .where(and(
            eq(Post.pid, pid),
            (i.grade >= 2) ? undefined : eq(Post.user, i.uid), // 管理和作者都能删除
        ))
    )?.[0]
    // 如果无权限或帖子不存在则报错
    if (!post) { return a.text('410:gone', 410) }
    if (post.land > 0) {
        // 如果删的是Thread
        await DB(a).batch([
            DB(a)
                .update(Post)
                .set({
                    attr: 3, // 主题自身被删 类型改为3
                })
                .where(eq(Post.pid, post.pid))
            ,
            DB(a)
                .update(Post)
                .set({
                    attr: 1, // 主题被删 公开回复 类型改为1
                })
                .where(and(
                    eq(Post.attr, 0),
                    eq(Post.land, -post.pid), // 隐藏Thread(tid=pid=-land)下所有回复
                ))
            ,
            DB(a)
                .update(User)
                .set({
                    golds: sql<number>`${User.golds} - 2`,
                    credits: sql<number>`${User.credits} - 2`,
                })
                .where(eq(User.uid, post.user))
            ,
        ])
    } else {
        // 如果删的是Post 如果所有回复都删了会返回null
        const last = DB(a).$with('last').as(
            DB(a)
                .select({
                    pid: Post.pid,
                    time: Post.time,
                })
                .from(Post)
                .where(and(
                    // attr
                    eq(Post.attr, 0),
                    // land
                    eq(Post.land, post.land), // 找到同一主题下的所有帖子 land本来就<0所以不用正负转换
                ))
                .orderBy(desc(Post.attr), desc(Post.land), desc(Post.time))
                .limit(1)
        )
        await DB(a).batch([
            DB(a)
                .update(Post)
                .set({
                    attr: 3,
                })
                .where(eq(Post.pid, post.pid))
            ,
            DB(a) // 注意逻辑顺序 必须先标记删除 再获取最后回复
                .with(last)
                .update(Post)
                .set({
                    sort: sql<number>`MIN((SELECT time FROM ${last}),${Post.sort})`, // 如果有不需要更新sort的分区
                    rpid: sql<number>`(SELECT COALESCE(pid,0) FROM ${last})`,
                })
                .where(eq(Post.pid, -post.land)) // 更新Thread(tid=-land)
            ,
            DB(a)
                .update(User)
                .set({
                    golds: sql<number>`${User.golds} - 1`,
                    credits: sql<number>`${User.credits} - 1`,
                })
                .where(eq(User.uid, post.user))
            ,
        ])
    }
    return a.text('ok')
}

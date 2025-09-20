import { Context } from "hono";
import { raw } from "hono/html";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { DB, Post } from "./base";
import { Auth } from "./core";
import { PEdit } from "../render/PEdit";

export async function pEdit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    if (i.grade <= -2) { return a.text('403', 403) } // 禁言用户
    const eid = parseInt(a.req.param('eid') ?? '0')
    let land = 0
    let title = ""
    let content = ""
    if (eid < 0) {
        title = "编辑"
        const post = (await DB(a)
            .select()
            .from(Post)
            .where(and(
                eq(Post.pid, -eid),
                inArray(Post.attr, [0, 1]), // 已删除的内容不能编辑
                (i.grade >= 3) ? undefined : eq(Post.user, i.uid), // 站长和作者都能编辑
                (i.grade >= 3) ? undefined : gt(sql<number>`${Post.time} + 604800`, a.get('time')), // 7天后禁止编辑
            ))
        )?.[0]
        if (!post) { return a.text('403', 403) }
        land = post.land;
        content = raw(post.content) ?? '';
    } else if (eid > 0) {
        title = "回复"
        land = -1;
    } else {
        title = "发帖"
    }
    const thread_lock = true;
    return a.html(PEdit(a, { i, title, eid, land, content, thread_lock }));
}

import { Context } from "hono";
import { raw } from "hono/html";
import { Props, DB, Post } from "./base";
import { Auth, IsAdmin } from "./core";
import { and, eq, gt, sql } from "drizzle-orm";
import { PEdit } from "../render/PEdit";

export interface PEditProps extends Props {
    eid: number,
    content: string,
    thread?: {
        tid: number,
        subject: string
    }
}

export async function pEdit(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const time = Math.floor(Date.now() / 1000)
    const eid = parseInt(a.req.param('eid') ?? '0')
    let title = ""
    let content = ''
    let thread: { tid: number, subject: string } | undefined
    if (eid < 0) {
        title = "编辑"
        const post = (await DB(a)
            .select()
            .from(Post)
            .where(and(
                eq(Post.pid, -eid),
                eq(Post.access, 0),
                IsAdmin(i, undefined, eq(Post.uid, i.uid)), // 管理和作者都能编辑
                IsAdmin(i, undefined, gt(sql`${Post.time} + 604800`, time)), // 7天后禁止编辑
            ))
        )?.[0]
        if (!post) { return a.text('403', 403) }
        content = raw(post.content) ?? ''
        if (post.tid) {
            thread = { tid: post.tid, subject: '' }
        }
    } else if (eid > 0) {
        title = "回复"
        thread = { tid: eid, subject: '' }
    } else {
        title = "发表"
        thread = undefined
    }
    const edit_forbid = true;
    return a.html(PEdit(a, { i, title, eid, content, edit_forbid, thread }));
}

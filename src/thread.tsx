import { Context } from "hono";
import { and, desc, eq, getTableColumns, inArray, lte, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { Props, DB, User, Meta, Post } from "./base";
import { Auth, Config, Pagination } from "./core";
import { TList } from "../render/TList";

export interface TListProps extends Props {
    page: number
    pagination: number[]
    data: (typeof Post.$inferSelect & {
        name: string | null;
        grade: number | null;
        credits: number | null;
        last_time: number | null;
        last_name: string | null;
        last_grade: number | null;
        last_credits: number | null;
        count: number | null;
    })[]
}

export async function tList(a: Context) {
    const i = await Auth(a)
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const user = parseInt(a.req.query('user') ?? '0')
    const page_size_t = await Config.get<number>(a, 'page_size_t') || 20
    const LastPost = alias(Post, 'LastPost')
    const LastUser = alias(User, 'LastUser')
    const data = await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            grade: User.grade,
            credits: User.credits,
            last_time: LastPost.time,
            last_name: LastUser.name,
            last_grade: LastUser.grade,
            last_credits: LastUser.credits,
            count: Meta.count,
        })
        .from(Post)
        .where(and(
            user ? eq(Post.uid, user) : eq(Post.call, 0),
            user ? eq(Post.zone, 0) : undefined,
            inArray(Post.type, [0, 1]),
        ))
        .leftJoin(User, eq(User.uid, Post.uid))
        .leftJoin(LastPost, eq(LastPost.pid, Post.rpid))
        .leftJoin(LastUser, eq(LastUser.uid, LastPost.uid))
        .leftJoin(Meta, eq(Meta.uid_tid, Post.pid))
        .orderBy(...(user ?
            [desc(Post.uid), desc(Post.zone), desc(Post.type), desc(Post.time)]
            :
            [desc(Post.call), desc(Post.type), desc(Post.sort)]
        ))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
    const count = (await DB(a)
        .select()
        .from(Meta)
        .where(eq(Meta.uid_tid, -user))
    )?.[0]?.count
    const pagination = Pagination(page_size_t, count ?? 0, page, 2)
    const title = await Config.get<string>(a, 'site_name')
    return a.html(TList(a, { i, page, pagination, data, title }));
}

export async function tPeak(a: Context) {
    const i = await Auth(a)
    if (!i || i.grade < 2) { return a.text('401', 401) }
    const tid = parseInt(a.req.param('tid') ?? '0')
    const post = (await DB(a)
        .update(Post)
        .set({
            type: sql<number>`CASE WHEN ${Post.type} = 0 THEN 1 ELSE 0 END`,
        })
        .where(and(
            eq(Post.pid, tid),
            lte(Post.zone, 0),
            inArray(Post.type, [0, 1]),
        ))
        .returning()
    )?.[0]
    // 如果无法置顶则报错
    if (!post) { return a.text('410:gone', 410) }
    return a.text('ok')
}

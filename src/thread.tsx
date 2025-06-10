import { Context } from "hono";
import { Props, DB, User, Count, Post } from "./base";
import { Auth, Config, Pagination } from "./core";
import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { TList } from "../render/TList";

export interface TListProps extends Props {
    uid: number
    page: number
    pagination: number[]
    data: (typeof Post.$inferSelect & {
        name: string | null;
        credits: number | null;
        gid: number | null;
        last_name: string | null;
        count: number | null;
    })[]
}

export async function tList(a: Context) {
    const i = await Auth(a)
    const page = parseInt(a.req.param('page') ?? '0') || 1
    const uid = parseInt(a.req.query('uid') ?? '0')
    const page_size_t = await Config.get<number>(a, 'page_size_t') || 20
    const LastUser = alias(User, 'LastUser')
    const data = await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            credits: User.credits,
            gid: User.gid,
            last_name: LastUser.name,
            count: Count.quantity,
        })
        .from(Post)
        .where(and(
            inArray(Post.type, [0, 1]),
            uid ? eq(Post.uid, uid) : eq(Post.quote_uid, 0),
            uid ? eq(Post.tid, 0) : undefined,
        ))
        .leftJoin(User, eq(User.uid, Post.uid))
        .leftJoin(LastUser, eq(LastUser.uid, Post.from_uid_pid))
        .leftJoin(Count, eq(Count.uid_tid, Post.pid))
        .orderBy(...(uid ?
            [desc(Post.type), desc(Post.uid), desc(Post.tid), desc(Post.time)]
            :
            [desc(Post.type), desc(Post.quote_uid), desc(Post.sort_time)]
        ))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
    const count = (await DB(a)
        .select()
        .from(Count)
        .where(eq(Count.uid_tid, uid))
    )?.[0]?.quantity
    const pagination = Pagination(page_size_t, count ?? 0, page, 2)
    const title = await Config.get<string>(a, 'site_name')
    return a.html(TList(a, { i, uid, page, pagination, data, title }));
}

export async function tPeak(a: Context) {
    const i = await Auth(a)
    if (!i || i.gid != 1) { return a.text('401', 401) }
    const tid = parseInt(a.req.param('tid') ?? '0')
    const post = (await DB(a)
        .update(Post)
        .set({
            type: sql`CASE WHEN ${Post.type} = 0 THEN 1 ELSE 0 END`,
        })
        .where(and(
            eq(Post.pid, tid),
            eq(Post.tid, 0),
            inArray(Post.type, [0, 1]),
        ))
        .returning()
    )?.[0]
    // 如果无法置顶则报错
    if (!post) { return a.text('410:gone', 410) }
    return a.text('ok')
}

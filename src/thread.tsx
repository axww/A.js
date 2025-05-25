import { Context } from "hono";
import { Props, DB, Thread, User, Count_User_Thread } from "./base";
import { Auth, Config, Pagination } from "./core";
import { and, desc, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { TList } from "../render/TList";

export interface TListProps extends Props {
    uid: number
    page: number
    pagination: number[]
    data: (typeof Thread.$inferSelect & {
        name: string | null;
        credits: number | null;
        gid: number | null;
        last_name: string | null;
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
            ...getTableColumns(Thread),
            name: User.name,
            credits: User.credits,
            gid: User.gid,
            last_name: LastUser.name,
        })
        .from(Thread)
        .where(and(
            eq(Thread.access, 0),
            uid ? eq(Thread.uid, uid) : undefined,
        ))
        .leftJoin(User, eq(Thread.uid, User.uid))
        .leftJoin(LastUser, eq(Thread.last_uid, LastUser.uid))
        .orderBy(...(uid ? [desc(Thread.access), desc(Thread.uid), desc(Thread.time)] : [desc(Thread.access), desc(Thread.is_top), desc(Thread.last_time)]))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
    const threads = (await DB(a)
        .select()
        .from(Count_User_Thread)
        .where(eq(Count_User_Thread.uid, uid))
    )?.[0]?.threads || 0
    const pagination = Pagination(page_size_t, threads, page, 2)
    const title = await Config.get<string>(a, 'site_name')
    return a.html(TList(a, { i, uid, page, pagination, data, title }));
}

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

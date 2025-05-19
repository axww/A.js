import { Context } from "hono";
import { Props, DB, Thread, User } from "./base";
import { Auth, Config, Pagination } from "./core";
import { and, desc, eq, getTableColumns, or } from 'drizzle-orm';
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
    const user = uid ? (await DB(a)
        .select()
        .from(User)
        .where(eq(User.uid, uid))
    )?.[0] : null;
    if (uid && !user) { return a.notFound() }
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
            uid ? eq(Thread.uid, uid) : or(eq(Thread.is_top, 1), eq(Thread.is_top, 0)),
        ))
        .leftJoin(User, eq(Thread.uid, User.uid))
        .leftJoin(LastUser, eq(Thread.last_uid, LastUser.uid))
        .orderBy(...(uid ? [desc(Thread.time)] : [desc(Thread.is_top), desc(Thread.last_time)]))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
    const threads = uid ? (user?.threads || 0) : (await Config.get<number>(a, 'threads') || 0)
    const pagination = Pagination(page_size_t, threads, page, 2)
    const title = await Config.get<string>(a, 'site_name')
    return a.html(TList(a, { i, uid, page, pagination, data, title }));
}

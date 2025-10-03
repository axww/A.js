import { Context } from "hono";
import { and, count, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, Config, Pagination } from "./core";
import { TList } from "../render/TList";
import { raw } from "hono/html";

export async function tList(a: Context) {
    const i = await Auth(a)
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const user = await Config.get<number>(a, 'user', true) ?? parseInt(a.req.query('user') ?? '0')
    const land = await Config.get<number>(a, 'land', true) ?? parseInt(a.req.query('land') ?? '0')
    const dynamic_sort = !user && !land // 未指定用户和版块时 使用全局动态排序 
    const page_size_t = await Config.get<number>(a, 'page_size_t') || 20
    const where = and(
        inArray(Post.attr, [0, 1]),
        ...(dynamic_sort ?
            [eq(Post.call_land, 0)]
            :
            [user ? eq(Post.user, user) : undefined, eq(Post.root_land, land)]
        )
    )
    const total = (await DB(a)
        .select({ total: count() })
        .from(Post)
        .where(where)
    )?.[0]?.total ?? 0
    const LastPost = alias(Post, 'LastPost')
    const LastUser = alias(User, 'LastUser')
    const data = total ? await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            grade: User.grade,
            credits: User.credits,
            last_time: LastPost.date_time,
            last_name: LastUser.name,
            last_grade: LastUser.grade,
            last_credits: LastUser.credits,
        })
        .from(Post)
        .where(where)
        .leftJoin(User, eq(User.uid, Post.user))
        .leftJoin(LastPost, eq(LastPost.pid, Post.refer_pid))
        .leftJoin(LastUser, eq(LastUser.uid, LastPost.user))
        .orderBy(desc(Post.attr),
            ...(dynamic_sort ?
                [desc(Post.call_land), desc(Post.show_time)]
                :
                [user ? desc(Post.user) : undefined, desc(Post.root_land), desc(Post.date_time)]
                    .filter(v => v !== undefined) // orderBy 需要自己过滤 undefined
            ))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
        : []
    const pagination = Pagination(page_size_t, total, page, 2)
    const title = raw(await Config.get<string>(a, 'site_name', false))
    return a.html(TList(a, { i, page, pagination, data, title }))
}

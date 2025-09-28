import { Context } from "hono";
import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, Config, Pagination } from "./core";
import { TList } from "../render/TList";

export async function tList(a: Context) {
    const i = await Auth(a)
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const user = parseInt(a.req.query('user') ?? '0')
    const land = parseInt(a.req.query('land') ?? '0')
    const dynamic_sort = !user && !land // 未指定用户和版块时 使用全局动态排序 
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
            total: sql<number>`COUNT(*) OVER()`,
        })
        .from(Post)
        .where(and(
            inArray(Post.attr, [0, 1]),
            ...(dynamic_sort ?
                [eq(Post.call, 0)]
                :
                [user ? eq(Post.user, user) : undefined, eq(Post.land, land)]
            )
        ))
        .leftJoin(User, eq(User.uid, Post.user))
        .leftJoin(LastPost, eq(LastPost.pid, Post.rpid))
        .leftJoin(LastUser, eq(LastUser.uid, LastPost.user))
        .orderBy(desc(Post.attr),
            ...(dynamic_sort ?
                [desc(Post.call), desc(Post.sort)]
                :
                [user ? desc(Post.user) : undefined, desc(Post.land), desc(Post.time)]
                    .filter(v => v !== undefined) // orderBy 需要自己过滤 undefined
            ))
        .offset((page - 1) * page_size_t)
        .limit(page_size_t)
    const pagination = Pagination(page_size_t, data[0]?.total ?? 0, page, 2)
    const title = await Config.get<string>(a, 'site_name', true);
    return a.html(TList(a, { i, page, pagination, data, title }));
}

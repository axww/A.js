import { Context } from "hono";
import { and, eq, inArray, ne, sql, asc, getTableColumns, gt, count } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, Config, Pagination, HTMLText } from "./core";
import { PList } from "../render/PList";
import { raw } from "hono/html";

export async function pList(a: Context) {
    const i = await Auth(a)
    const tid = parseInt(a.req.param('tid'))
    const QuotePost = alias(Post, 'QuotePost')
    const QuoteUser = alias(User, 'QuoteUser')
    const thread = (await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            grade: User.grade,
            credits: User.credits,
            quote_content: sql<string>`''`,
            quote_name: sql<string>`''`,
        })
        .from(Post)
        .where(and(
            eq(Post.pid, tid),
            inArray(Post.attr, [0, 1]),
            gt(Post.root_land, 0), // 必须是Thread(root_land>0)
        ))
        .leftJoin(User, eq(Post.user, User.uid))
    )?.[0]
    if (!thread) { return a.notFound() }
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const where = and(
        eq(Post.attr, 0),
        eq(Post.root_land, -tid),
    )
    const total = (await DB(a)
        .select({ total: count() })
        .from(Post)
        .where(where)
    )?.[0]?.total ?? 0
    const data = total ? await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            grade: User.grade,
            credits: User.credits,
            quote_content: QuotePost.content,
            quote_name: QuoteUser.name,
        })
        .from(Post)
        .where(where)
        .leftJoin(User, eq(Post.user, User.uid))
        .leftJoin(QuotePost, and(eq(QuotePost.pid, Post.refer_pid), inArray(QuotePost.attr, [0, 1]), ne(Post.refer_pid, sql`-${Post.root_land}`)))
        .leftJoin(QuoteUser, eq(QuoteUser.uid, QuotePost.user))
        .orderBy(asc(Post.attr), asc(Post.root_land), asc(Post.date_time))
        .offset((page - 1) * page_size_p)
        .limit(page_size_p)
        : []
    const pagination = Pagination(page_size_p, total, page, 2)
    const title = raw(await HTMLText(thread.content, 140, true))
    const thread_lock = [1, 2].includes(thread.root_land) && (a.get('time') > (thread.show_time + 604800))
    data.unshift(thread);
    return a.html(PList(a, { i, page, pagination, data, title, thread_lock }))
}

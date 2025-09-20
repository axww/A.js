import { Context } from "hono";
import { and, eq, inArray, ne, sql, asc, getTableColumns, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Post, User } from "./base";
import { Auth, Config, Pagination, HTMLText } from "./core";
import { PList } from "../render/PList";

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
            total: 0, // 字段对齐
        })
        .from(Post)
        .where(and(
            eq(Post.pid, tid),
            inArray(Post.attr, [0, 1]),
            gt(Post.land, 0), // 必须是Thread(land>0)
        ))
        .leftJoin(User, eq(Post.user, User.uid))
    )?.[0]
    if (!thread) { return a.notFound() }
    const page = parseInt(a.req.query('page') ?? '0') || 1
    const page_size_p = await Config.get<number>(a, 'page_size_p') || 20
    const data = await DB(a)
        .select({
            ...getTableColumns(Post),
            name: User.name,
            grade: User.grade,
            credits: User.credits,
            quote_content: QuotePost.content,
            quote_name: QuoteUser.name,
            total: sql<number>`COUNT(*) OVER()`,
        })
        .from(Post)
        .where(and(
            eq(Post.attr, 0),
            eq(Post.land, -tid),
        ))
        .leftJoin(User, eq(Post.user, User.uid))
        .leftJoin(QuotePost, and(eq(QuotePost.pid, Post.rpid), inArray(QuotePost.attr, [0, 1]), ne(Post.rpid, sql`-${Post.land}`)))
        .leftJoin(QuoteUser, eq(QuoteUser.uid, QuotePost.user))
        .orderBy(asc(Post.attr), asc(Post.land), asc(Post.time))
        .offset((page - 1) * page_size_p)
        .limit(page_size_p)
    const pagination = Pagination(page_size_p, data[0]?.total ?? 0, page, 2)
    const title = await HTMLText(thread.content, 140, true)
    const thread_lock = [1, 2].includes(thread.land) && (a.get('time') > (thread.sort + 604800))
    data.unshift(thread);
    return a.html(PList(a, { i, page, pagination, data, title, thread_lock }))
}

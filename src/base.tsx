import { Context } from "hono";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from '@libsql/client/node';
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export function DB(a: Context) {
    let db = a.get('db');
    if (!db) {
        db = drizzle(createClient({ url: "file:www.db" }));
        a.set('db', db);
    }
    return db;
}

export const Conf = sqliteTable("conf", {
    key: text().primaryKey(),
    value: text(),
});

export const Post = sqliteTable("post", {
    pid: integer().primaryKey(),
    attr: integer().notNull().default(0), // 0正常 1连带删除 2自己删除 3管理删除
    user: integer().notNull().default(0),
    refer_pid: integer().notNull().default(0), // T:last_pid P:quote_pid
    call_land: integer().notNull().default(0), // P:回复呼叫用户 T:话题聚合分区
    show_time: integer().notNull().default(0), // T:last_time P:post_time
    root_land: integer().notNull().default(0), // T:>0节点 P:<0所属Thread帖子pid
    date_time: integer().notNull().default(0),
    content: text().notNull().default(''),
}, (table) => [
    index("post:attr,call_land,show_time").on(table.attr, table.call_land, table.show_time),
    // call_land=0,首页帖子(回复时间排序)
    // call_land=*,消息通知(指定被回复人)
    index("post:attr,root_land,date_time").on(table.attr, table.root_land, table.date_time),
    index("post:attr,user,root_land,date_time").on(table.attr, table.user, table.root_land, table.date_time),
    // root_land>0,各节点帖子(发表时间排序)
    // root_land<0,帖内回复(发表时间排序)
    // user=*,只显示某用户的
]);

export const User = sqliteTable("user", {
    uid: integer().primaryKey(),
    time: integer().notNull().default(0),
    mail: text().notNull().default('').unique(), // COLLATE NOCASE
    name: text().notNull().default('').unique(), // COLLATE NOCASE
    hash: text().notNull().default(''),
    salt: text().notNull().default(''),
    grade: integer().notNull().default(0), // 0用户 1贵宾 2管理 3站长
    golds: integer().notNull().default(0),
    credits: integer().notNull().default(0),
    last_post: integer().notNull().default(0),
    last_read: integer().notNull().default(0),
});

export interface Props {
    i: Omit<typeof User.$inferSelect, "hash" | "salt"> & { last_message: number } | undefined
    title: string
    keywords?: string; // SEO 可选关键词
    description?: string; // SEO 可选描述
    thread_lock?: boolean
    head_external?: string
}

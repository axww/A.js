import { Context } from "hono";
import { createClient } from '@libsql/client/node';
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/*
【致开发者】
感谢您的贡献，核心数据库结构，请尽量避免修改。
如果需要做结构上的变动，请先在GitHub讨论区发帖。
*/

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

export const Meta = sqliteTable("meta", {
    uid_tid: integer().primaryKey(),
    count: integer().notNull().default(0),
});

export const Post = sqliteTable("post", {
    pid: integer().primaryKey(),
    tid: integer().notNull().default(0),
    uid: integer().notNull().default(0),
    type: integer().notNull().default(0), // 0正常 T1置顶 P1帖删 2自删 3被删
    time: integer().notNull().default(0),
    sort_time: integer().notNull().default(0), // T:sort_time P:post_time
    quote_uid: integer().notNull().default(0), // T:0 P:quote_uid N:-quote_uid
    relate_id: integer().notNull().default(0), // T:last_uid P:quote_pid
    content: text().notNull().default(''),
}, (table) => [
    index("post:type,tid,time").on(table.type, table.tid, table.time),
    index("post:type,uid,tid,time").on(table.type, table.uid, table.tid, table.time),
    // tid=0,首页帖子(发表时间排序)
    // tid!=0,帖内回复(发表时间排序)
    // uid=*,只显示某用户的
    index("post:type,quote_uid,sort_time").on(table.type, table.quote_uid, table.sort_time),
    // quote_uid=0,首页帖子(回复时间排序)
    // quote_uid=*,消息通知(指定被回复人)
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
    description?: string;  // 可选的描述属性，用于SEO
    thread_lock?: boolean
    head_external?: string
}

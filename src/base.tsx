import { Context } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/*
【致开发者】
感谢您的贡献，核心数据库结构，请尽量避免修改。
如果需要做结构上的变动，请先在GitHub讨论区发帖。
*/

export function DB(a: Context) {
    return drizzle(a.env.DB);
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
    pivot_uid: integer().notNull().default(0), // T:uid P:-quote_uid N:0
    relate_id: integer().notNull().default(0), // T:last_uid P:quote_pid
    content: text().notNull().default(''),
}, (table) => [
    index("post:type,tid,sort_time").on(table.type, table.tid, table.sort_time),
    // tid=0,首页帖子
    // tid!=0,帖内回复
    index("post:type,pivot_uid,time").on(table.type, table.pivot_uid, table.time),
]);

export const User = sqliteTable("user", {
    uid: integer().primaryKey(),
    gid: integer().notNull().default(0),
    time: integer().notNull().default(0),
    mail: text().notNull().default('').unique(),
    name: text().notNull().default('').unique(),
    hash: text().notNull().default(''),
    salt: text().notNull().default(''),
    credits: integer().notNull().default(0),
    golds: integer().notNull().default(0),
    last_post: integer().notNull().default(0),
    last_read: integer().notNull().default(0),
});

export type I = Omit<typeof User.$inferSelect, "hash" | "salt"> & {
    last_message: number;
};

export interface Props {
    i: I | undefined
    title: string
    description?: string;  // 可选的描述属性，用于SEO
    thread_lock?: boolean
    head_external?: string
}

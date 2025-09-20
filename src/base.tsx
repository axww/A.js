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
    attr: integer().notNull().default(0), // 0正常 T1置顶 P1帖删 2自删 3被删
    user: integer().notNull().default(0),
    call: integer().notNull().default(0), // =0主题 >0回复他人 <0回复自己
    land: integer().notNull().default(0), // T:>0节点 P:<0所属Thread帖子pid
    rpid: integer().notNull().default(0), // T:last_pid P:quote_pid
    time: integer().notNull().default(0),
    sort: integer().notNull().default(0), // T:last_time P:post_time
    content: text().notNull().default(''),
}, (table) => [
    index("post:attr,call,sort").on(table.attr, table.call, table.sort),
    // call=0,首页帖子(回复时间排序)
    // call=*,消息通知(指定被回复人)
    index("post:attr,land,time").on(table.attr, table.land, table.time),
    index("post:attr,user,land,time").on(table.attr, table.user, table.land, table.time),
    // land>0,各节点帖子(发表时间排序)
    // land<0,帖内回复(发表时间排序)
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
    description?: string;  // 可选的描述属性，用于SEO
    thread_lock?: boolean
    head_external?: string
}

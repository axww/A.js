import { Context } from "hono";
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { alias } from "drizzle-orm/sqlite-core";
import { DB, Message, Post, User } from "./base";
import { Auth, HTMLText } from "./core";
import { MList } from "../render/MList";

export async function _mList(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const type = a.req.queries('type')?.map(Number).filter(n => !isNaN(n)) ?? [];
    const pid = parseInt(a.req.query('pid') ?? '0');
    const QuotePost = alias(Post, 'QuotePost')
    const data = await DB(a)
        .select({
            type: Message.type, // 添加消息类型字段，用于区分已读/未读
            quote_pid: QuotePost.pid,
            quote_content: QuotePost.content,
            post_uid: User.uid,
            post_name: User.name,
            post_pid: Post.pid,
            post_tid: Post.tid,
            post_time: Post.time,
            post_content: Post.content,
        })
        .from(Message)
        .where(and(
            eq(Message.uid, i.uid),
            inArray(Message.type, type),
            pid ? lt(Message.pid, pid) : undefined,
        ))
        .leftJoin(Post, eq(Post.pid, Message.pid))
        .leftJoin(User, eq(User.uid, Post.uid))
        .leftJoin(QuotePost, eq(QuotePost.pid, Post.quote_pid))
        .orderBy(desc(Message.uid), desc(Message.type), desc(Message.pid))
        .limit(10)
    await Promise.all(data.map(async function (row) {
        row.quote_content = await HTMLText(row.quote_content, 300);
        row.post_content = await HTMLText(row.post_content, 300);
    }))
    return a.json(data)
}

export async function _mClear(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    await mClear(a, i.uid, 1);
    return a.json('ok')
}

// 标记单条消息为已读
export async function _mRead(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }

    const pid = parseInt(a.req.query('pid') ?? '0');
    if (!pid) { return a.json({ success: false, message: '无效的消息ID' }) }

    await mRead(a, i.uid, 1, pid);
    return a.json({ success: true });
}

export async function mList(a: Context) {
    const i = await Auth(a)
    if (!i) {
        // 重定向到登录页面而不是返回401
        return a.redirect('/auth');
    }
    const title = '消息'
    return a.html(MList(a, { i, title }));
}

// 增加消息
export async function mAdd(a: Context, uid: number, type: number, pid: number) {
    try {
        await DB(a)
            .insert(Message)
            .values({
                uid,
                type,
                pid,
            });
        // 增加未读回复计数
        (type == 1) && await DB(a)
            .update(User)
            .set({
                messages: sql`${User.messages}+1`,
            })
            .where(
                eq(User.uid, uid),
            );
    } catch (error) {
        console.error('插入失败:', error);
        // 如果插入失败则提醒 因为发帖时只运行一次 应该不会有冲突 但以防万一
    }
}

// 删除消息
export async function mDel(a: Context, uid: number, type: number[], pid: number) {
    try {
        const message = (await DB(a)
            .delete(Message)
            .where(and(
                eq(Message.uid, uid),
                inArray(Message.type, type),
                eq(Message.pid, pid),
            ))
            .returning({ uid: Message.uid, type: Message.type })
        )?.[0];
        // 减少未读回复计数
        message && message.type == 1 && await DB(a)
            .update(User)
            .set({
                messages: sql`${User.messages}-1`,
            })
            .where(
                eq(User.uid, uid),
            );
    } catch (error) {
        console.error('删除失败:', error);
        // 如果记录已经被删除 也不会报错 但以防万一
    }
}

// 已读消息 type也可输入负数 从已读切换到未读
export async function mRead(a: Context, uid: number, type: number, pid: number) {
    try {
        await DB(a)
            .update(Message)
            .set({
                type: -type,
            })
            .where(and(
                eq(Message.uid, uid),
                eq(Message.type, type),
                eq(Message.pid, pid),
            ))
            .returning({ uid: Message.uid });
        // 已读变未读 type=-1 messages+1 未读变已读 type=1 messages-1
        [-1, 1].includes(type) && await DB(a)
            .update(User)
            .set({
                messages: sql`${User.messages}-${type}`,
            })
            .where(
                eq(User.uid, uid),
            );
    } catch (error) {
        console.error('切换失败:', error);
    }
}

// 全部设置已读
export async function mClear(a: Context, uid: number, type: number) {
    try {
        await DB(a)
            .update(Message)
            .set({
                type: -type,
            })
            .where(and(
                eq(Message.uid, uid),
                eq(Message.type, type),
            ));
        // 清空所有消息
        await DB(a)
            .update(User)
            .set({
                messages: 0,
            })
            .where(
                eq(User.uid, uid),
            );
    } catch (error) {
        console.error('切换失败:', error);
    }
}

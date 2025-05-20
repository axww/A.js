import { Context } from "hono";
import { sign } from "hono/jwt";
import { deleteCookie, setCookie } from "hono/cookie";
import { and, eq, or, count } from "drizzle-orm";
import { DB, User, Message } from "./base";
import { Auth, Config, Maps, MD5, RandomString } from "./core";
import { UAuth } from "../render/UAuth";
import { UConf } from "../render/UConf";

// 设置用户COOKIE为待更新
export async function cookieReset(uid: number, reset: boolean | undefined = undefined) {
    const map = Maps.get<number, boolean>('cookieReset');
    if (reset === undefined) {
        return map.get(uid);
    }
    map.set(uid, reset);
    return reset;
}

// 用户未读回复计数
export async function unreadMessage(a: Context, uid: number, change: number | null = 0) {
    const map = Maps.get<number, number>('unreadMessage');
    let sum = map.get(uid);
    // 消息初始化
    if (sum === undefined) {
        sum = (await DB(a)
            .select({ count: count(Message.pid) })
            .from(Message)
            .where(and(
                eq(Message.uid, uid),
                eq(Message.type, 1),
            ))
            .limit(1)
        )?.[0].count || 0;
        map.set(uid, sum)
    }
    // 消息数量改变
    if (change !== 0) {
        sum = change ? (sum + change) : 0
        map.set(uid, sum);
    }
    return sum;
}

// 用户上次发帖时间（防止频繁发帖）
export function lastPostTime(uid: number, time: number = 0) {
    const map = Maps.get<number, number>('lastPostTime');
    if (time) {
        map.set(uid, time);
        return time;
    }
    return (map.get(uid) || 0);
}

export async function uAuth(a: Context) {
    const i = await Auth(a)
    const title = "登录"
    return a.html(UAuth(a, { i, title }));
}

export async function uConf(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const title = "设置"
    return a.html(UConf(a, { i, title }));
}

export async function uLogin(a: Context) {
    const body = await a.req.formData();
    const acct = body.get('acct')?.toString().toLowerCase() // 登录凭证 邮箱 或 昵称
    const pass = body.get('pass')?.toString();
    if (!acct || !pass) {
        return a.text('401', 401);
    }
    const user = (await DB(a)
        .select()
        .from(User)
        .where(or(eq(User.mail, acct), eq(User.name, acct)))
    )?.[0];
    if (!user) {
        return a.text('no user', 401);
    }
    const inputHash = await MD5(pass + user.salt);
    const storedHash = user.hash;
    if (inputHash !== storedHash) {
        return a.text('401', 401);
    }
    const { hash, salt, ...i } = user;
    try {
        const token = await sign(i, await Config.get<string>(a, 'secret_key'));
        setCookie(a, 'JWT', token, { maxAge: 2592000 });
        return a.text('ok');
    } catch (error) {
        console.error('JWT signing failed:', error);
        return a.text('500', 500);
    }
}

export async function uLogout(a: Context) {
    deleteCookie(a, 'JWT')
    return a.text('ok')
}

export async function uRegister(a: Context) {
    const body = await a.req.formData()
    const acct = body.get('acct')?.toString().toLowerCase() ?? ''
    const pass = body.get('pass')?.toString() ?? ''
    if (!acct || !pass) { return a.notFound() }
    const time = Math.floor(Date.now() / 1000)
    let rand = RandomString(16);
    const data = (await DB(a)
        .insert(User)
        .values({
            mail: acct,
            name: '#' + time,
            hash: await MD5(pass + rand),
            salt: rand,
            time,
        })
        .onConflictDoNothing()
        .returning()
    )?.[0]
    if (!data) { return a.text('data_conflict', 409) }
    const { hash, salt, ...i } = data
    setCookie(a, 'JWT', await sign(i, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 })
    return a.text('ok')
}

export async function uSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const body = await a.req.formData()
    const mail = body.get('mail')?.toString() ?? ''
    if (!mail) { return a.text('mail_empty', 422) }
    if (mail.length > 320) { return a.text('mail_too_long', 422) }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail)) { return a.text('mail_illegal', 422) }
    const name = body.get('name')?.toString() ?? ''
    if (!name) { return a.text('name_empty', 422) }
    if (name.length > 20) { return a.text('name_too_long', 422) }
    if (!/^[\p{L}][\p{L}\p{N}_-]*$/u.test(name)) { return a.text('name_illegal', 422) }
    const pass = body.get('pass')?.toString() ?? ''
    const pass_confirm = body.get('pass_confirm')?.toString() ?? ''
    const data = (await DB(a)
        .select()
        .from(User)
        .where(eq(User.uid, i.uid))
    )?.[0]
    if (!data || await MD5(pass_confirm + data.salt) != data.hash) { return a.text('pass_confirm', 401) }
    try {
        await DB(a)
            .update(User)
            .set({
                mail: mail,
                name: name,
                hash: pass ? await MD5(pass + data.salt) : undefined,
            })
            .where(eq(User.uid, i.uid))
    } catch (error) {
        return a.text('data_conflict', 409)
    }
    i.mail = mail
    i.name = name
    setCookie(a, 'JWT', await sign(i, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 })
    return a.text('ok')
}

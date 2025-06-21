import { Context } from "hono";
import { sign } from "hono/jwt";
import { deleteCookie, setCookie } from "hono/cookie";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { DB, User } from "./base";
import { Auth, Config, MD5, RandomString } from "./core";
import { UAuth } from "../render/UAuth";
import { UConf } from "../render/UConf";

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
    if (await MD5(pass + user.salt) !== user.hash) {
        return a.text('401', 401);
    }
    try {
        setCookie(a, 'JWT', await sign({ uid: user.uid }, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 });
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
    let rand = RandomString(16);
    const user = (await DB(a)
        .insert(User)
        .values({
            mail: acct,
            name: '#' + a.get('time'),
            hash: await MD5(pass + rand),
            salt: rand,
            time: a.get('time'),
        })
        .onConflictDoNothing()
        .returning()
    )?.[0]
    if (!user) { return a.text('data_conflict', 409) }
    try {
        setCookie(a, 'JWT', await sign({ uid: user.uid }, await Config.get<string>(a, 'secret_key')), { maxAge: 2592000 });
        return a.text('ok');
    } catch (error) {
        console.error('JWT signing failed:', error);
        return a.text('500', 500);
    }
}

export async function uSave(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const body = await a.req.formData();
    const mail = body.get('mail')?.toString() ?? '';
    if (!mail) { return a.text('mail_empty', 422) }
    if (mail.length > 320) { return a.text('mail_too_long', 422) }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(mail)) { return a.text('mail_illegal', 422) }
    const name = body.get('name')?.toString() ?? ''
    if (!name) { return a.text('name_empty', 422) }
    if (name.length > 20) { return a.text('name_too_long', 422) }
    if (!/^[\p{L}][\p{L}\p{N}_-]*$/u.test(name)) { return a.text('name_illegal', 422) }
    const pass = body.get('pass')?.toString() ?? ''
    const pass_confirm = body.get('pass_confirm')?.toString() ?? ''
    const user = (await DB(a)
        .select()
        .from(User)
        .where(eq(User.uid, i.uid))
    )?.[0]
    if (!user || await MD5(pass_confirm + user.salt) != user.hash) { return a.text('pass_confirm', 401) }
    try {
        await DB(a)
            .update(User)
            .set({
                mail: mail,
                name: name,
                hash: pass ? await MD5(pass + user.salt) : undefined,
            })
            .where(eq(User.uid, i.uid))
    } catch (error) {
        return a.text('data_conflict', 409)
    }
    return a.text('ok')
}

export async function uAdv(a: Context) {
    const i = await Auth(a)
    if (!i || i.group < 2) { return a.text('401', 401) }
    const uid = parseInt(a.req.param('uid') ?? '0')
    const user = (await DB(a)
        .update(User)
        .set({
            group: sql<number>`CASE WHEN ${User.group} !=-1 THEN -1 ELSE 0 END`,
        })
        .where(and(
            eq(User.uid, uid),
            lt(User.group, 1), // 无权封禁贵宾以上用户组
        ))
        .returning()
    )?.[0]
    // 如果无法标记则报错
    if (!user) { return a.text('410:gone', 410) }
    return a.text('ok')
}

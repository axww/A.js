import { Context } from "hono";
import { sign } from "hono/jwt";
import { deleteCookie, setCookie } from "hono/cookie";
import { DB, User } from "../src/base";
import { Auth, Config, MD5, RandomString } from "../src/core";
import { eq, or } from "drizzle-orm";

export async function iLogin(a: Context) {
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

export async function iLogout(a: Context) {
    deleteCookie(a, 'JWT')
    return a.text('ok')
}

export async function iRegister(a: Context) {
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

export async function iSave(a: Context) {
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

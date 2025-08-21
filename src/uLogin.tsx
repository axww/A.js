import { Context } from "hono";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { eq, or } from "drizzle-orm";
import { Md5 } from "ts-md5";
import { DB, User } from "./base";
import { Config } from "./core";


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
    if (Md5.hashStr(pass + user.salt) !== user.hash) {
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

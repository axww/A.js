import { Context } from "hono";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";
import { Md5 } from "ts-md5";
import { DB, User } from "./base";
import { Config, RandomString } from "./core";

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
            hash: Md5.hashStr(pass + rand),
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

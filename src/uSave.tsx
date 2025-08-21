import { Context } from "hono";
import { eq } from "drizzle-orm";
import { Md5 } from "ts-md5";
import { DB, User } from "./base";
import { Auth } from "./core";

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
    if (!user || Md5.hashStr(pass_confirm + user.salt) != user.hash) { return a.text('pass_confirm', 401) }
    try {
        await DB(a)
            .update(User)
            .set({
                mail: mail,
                name: name,
                hash: pass ? Md5.hashStr(pass + user.salt) : undefined,
            })
            .where(eq(User.uid, i.uid))
    } catch (error) {
        return a.text('data_conflict', 409)
    }
    return a.text('ok')
}

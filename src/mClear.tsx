import { Context } from "hono";
import { eq } from 'drizzle-orm';
import { DB, User } from "./base";
import { Auth } from "./core";

// 清空消息
export async function mClear(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    try {
        await DB(a)
            .update(User)
            .set({
                last_read: a.get('time'),
            })
            .where(
                eq(User.uid, i.uid),
            );
    } catch (error) {
        console.error('切换失败:', error);
    }
    return a.json('ok')
}

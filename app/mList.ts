import { Context } from "hono";
import { Auth } from "./core";
import { MList } from "../bare/MList";

export async function mList(a: Context) {
    const i = await Auth(a)
    if (!i) { 
        // 重定向到登录页面而不是返回401
        return a.redirect('/auth');
    }
    const title = '消息'
    return a.html(MList({ a, i, title }));
}

import { Context } from "hono";
import { Auth } from "./core";
import { IAuth } from "../render/IAuth";

export async function iAuth(a: Context) {
    const i = await Auth(a)
    const title = "登录"
    return a.html(IAuth(a, { i, title }));
}

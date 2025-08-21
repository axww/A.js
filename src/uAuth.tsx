import { Context } from "hono";
import { Auth } from "./core";
import { UAuth } from "../render/UAuth";

export async function uAuth(a: Context) {
    const i = await Auth(a)
    const title = "登录"
    return a.html(UAuth(a, { i, title }));
}

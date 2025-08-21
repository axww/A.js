import { Context } from "hono";
import { Auth } from "./core";
import { UConf } from "../render/UConf";

export async function uConf(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const title = "设置"
    return a.html(UConf(a, { i, title }));
}

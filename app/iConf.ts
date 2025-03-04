import { Context } from "hono";
import { Auth } from "./core";
import { IConf } from "../bare/IConf";

export async function iConf(a: Context) {
    const i = await Auth(a)
    if (!i) { return a.text('401', 401) }
    const title = "设置"
    return a.html(IConf({ a, i, title }));
}

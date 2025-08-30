import { Context } from "hono";
import { Config } from "./core";

export async function fUpload(a: Context) {
    const blob = await a.req.blob();
    const form = new FormData();
    form.append('key', await Config.get<string>(a, 'imgbb_key'));
    form.append('image', blob, a.get('time').toString());
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (response.ok) {
        return a.json((await response.json()) as JSON)
    } else {
        return a.text(await response.text(), 500)
    }
}

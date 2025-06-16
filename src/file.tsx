import { Context } from "hono";

export async function fUpload(a: Context) {
    const blob = await a.req.blob();
    const form = new FormData();
    form.append('key', a.env.ImgBBKey);
    form.append('image', blob, a.get('time').toString());
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (response.ok) {
        return a.json((await response.json()) as JSON)
    } else {
        return a.text(await response.text(), 500)
    }
}

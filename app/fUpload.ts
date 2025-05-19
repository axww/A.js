import { Context } from "hono";

export async function fUpload(a: Context) {
    const time = Math.floor(Date.now() / 1000);
    const blob = await a.req.blob();
    const form = new FormData();
    form.append('key', '02b0ac824fd4f83e161f51d767dd9b25');
    form.append('image', blob, time + '');
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (response.ok) {
        return a.json(await response.json())
    } else {
        return a.text(await response.text(), 500)
    }
}

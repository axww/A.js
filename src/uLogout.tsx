import { Context } from "hono";
import { deleteCookie } from "hono/cookie";

export async function uLogout(a: Context) {
    deleteCookie(a, 'JWT')
    return a.text('ok')
}

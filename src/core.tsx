import { Context } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { eq } from 'drizzle-orm';
import { DB, Conf, I, User } from "./base";

export class Maps {
    // 存储 map 的内存容器
    private static maps: Map<string, Map<any, any>> = new Map();
    // 创建一个新的 map，并保存到静态存储中
    static set<K, V>(name: string, entries?: [K, V][]): Map<K, V> {
        const map = new Map<K, V>(entries);
        this.maps.set(name, map);
        return map;
    }
    // 取出指定名称的 map 如果不存在则自动创建一个新的 map
    static get<K, V>(name: string): Map<K, V> {
        if (!this.maps.has(name)) {
            this.set<K, V>(name);
        }
        return this.maps.get(name) as Map<K, V>;
    }
    // 删除一个 map
    static del(name: string): boolean {
        return this.maps.delete(name);
    }
    // 列出所有 map 的名字
    static all(): string[] {
        return Array.from(this.maps.keys());
    }
}

export class Config {
    private static data = Maps.get<string, any>('Config');
    private static void = true;
    private constructor() { }
    static async init(a: Context) {
        const configs = await DB(a).select().from(Conf);
        configs.forEach(({ key, value }) => {
            try {
                this.data.set(key, value ? JSON.parse(value) : null);
                this.void = false;
            } catch (error) {
                console.error(`Failed to parse config ${key}:`, error);
            }
        });
    }
    static async get<T>(a: Context, key: string): Promise<T> {
        if (this.void) { await this.init(a); }
        return this.data.get(key) as T;
    }
    static async set(a: Context, key: string, value: any) {
        if (this.void) { await this.init(a); }
        try {
            await DB(a)
                .insert(Conf)
                .values({ key, value })
                .onConflictDoUpdate({
                    target: Conf.key,
                    set: { value }
                });
            this.data.set(key, value);
        } catch (error) {
            console.error(`Failed to set config ${key}:`, error);
        }
    }
}

export async function Auth(a: Context) {
    const jwt = getCookie(a, 'JWT');
    if (!jwt) { return undefined }
    let auth = await verify(jwt, await Config.get<string>(a, 'secret_key')) as { uid: number }
    if (!auth.uid) { return undefined }
    const user = (await DB(a)
        .select()
        .from(User)
        .where(eq(User.uid, auth.uid))
    )?.[0]
    if (!user) { return undefined }
    const { hash, salt, ...i } = user // 把密码从返回数据中抹除
    return i
}

export function IsAdmin(i: I, allow: any, disallow: any) {
    // 是否拥有管理权限 是则返回 allow 否则返回 disallow
    if ([1].includes(i.gid)) {
        return allow;
    } else {
        return disallow;
    }
}

export function Pagination(perPage: number, sum: number, page: number, near: number) {
    if (!page) { page = 1 }
    // 首页
    const navigation = [1]
    const maxPage = Math.floor((sum + perPage - 1) / perPage)
    if (page <= 1 + near) {
        // 首页邻页
        const edge = 1 + near * 2
        for (let p = 2; p <= edge && p < maxPage; p++) {
            navigation.push(p)
        }
        if (edge < maxPage - 1) {
            navigation.push(0)
        }
    } else if (page >= maxPage - near) {
        // 尾页邻页
        const edge = maxPage - near * 2
        if (edge > 2) {
            navigation.push(0)
        }
        for (let p = edge; p < maxPage; p++) {
            if (p > 1) {
                navigation.push(p)
            }
        }
    } else {
        // 非首尾页
        if (page - near > 2) {
            navigation.push(0)
        }
        for (let p = page - near; p <= page + near; p++) {
            navigation.push(p)
        }
        if (page + near < maxPage - 1) {
            navigation.push(0)
        }
    }
    // 尾页
    if (maxPage > 1) {
        navigation.push(maxPage)
    }
    return navigation
}

export async function HTMLFilter(html: string | null | undefined) {
    if (!html) { return ''; }
    const allowedTags = new Set(['a', 'b', 'i', 'u', 'font', 'strong', 'em', 'strike', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'menu', 'multicol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'p', 'div', 'pre', 'br', 'img', 'video', 'audio', 'code', 'blockquote', 'iframe', 'section']);
    const allowedAttrs = new Set(['target', 'href', 'src', 'alt', 'rel', 'width', 'height', 'size', 'border', 'align', 'colspan', 'rowspan', 'cite']);
    return await new HTMLRewriter().on("*", {
        element: e => {
            if (!allowedTags.has(e.tagName)) {
                e.removeAndKeepContent();
                return;
            }
            for (const [name, value] of e.attributes) {
                if (!allowedAttrs.has(name) || value.length > 8000) {
                    e.removeAttribute(name);
                }
            }
        }
    }).transform(new Response(html, { headers: { "Content-Type": "text/html" } })).text();
}

export async function HTMLText(html: string | null | undefined, len = 0, first = false) {
    if (!html) { return ''; }
    let stop = 0;
    let text = '';
    await new HTMLRewriter().on('*', {
        element: e => {
            if (stop == 2) { return; }
            if (['p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(e.tagName)) {
                text += ' '
                // 如果只取首行 且遇到换行符 则标记预备停止
                if (first && !stop) {
                    stop = 1;
                    e.onEndTag(() => {
                        stop = text.trim() ? 2 : 0;
                    })
                }
            }
        },
        text: t => {
            if (stop == 2) { return; }
            if (t.text) {
                text += t.text
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, " ")
                    .trim()
            }
        }
    }).transform(new Response(html, { headers: { "Content-Type": "text/html" } })).text();
    if (len > 0) {
        const lenOld = text.length
        if (lenOld > len) {
            text = text.slice(0, len - 3) + '...'
        }
    }
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#39;")
        .trim() || '...'
}

export function URLQuery(a: Context) {
    const allow = ['uid', 'pid'];
    const query = new URLSearchParams();
    Object.entries(a.req.query()).forEach(([key, val]) => {
        if (allow.includes(key)) {
            query.append(key, val);
        }
    });
    return query.size ? '?' + query.toString() : '';
}

export function RandomString(length: number = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // 仅限 A-Z 和 0-9
    let result = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]; // 确保字符范围只在 chars 内
    }
    return result;
}

export async function MD5(str: string) {
    return Array
        .from(new Uint8Array(await crypto.subtle.digest("MD5", new TextEncoder().encode(str))))
        .map(b => b.toString(16).padStart(2, "0")).join("")
}

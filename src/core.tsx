import { Context } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { eq, and, desc, getTableColumns, sql } from 'drizzle-orm';
import { DB, Conf, Post, User } from "./base";

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
    const message = DB(a).$with('message').as(
        DB(a)
            .select({
                time: Post.time,
            })
            .from(Post)
            .where(and(
                eq(Post.type, 0),
                eq(Post.quote_uid, auth.uid),
            ))
            .orderBy(desc(Post.type), desc(Post.quote_uid), desc(Post.sort_time))
            .limit(1)
    )
    const user = (await DB(a)
        .with(message)
        .select({
            ...getTableColumns(User),
            last_message: sql<number>`(SELECT COALESCE(time,0) FROM ${message})`,
        })
        .from(User)
        .where(eq(User.uid, auth.uid))
    )?.[0]
    if (!user) { return undefined }
    const { hash, salt, ...i } = user // 把密码从返回数据中抹除
    return i
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

export async function HTMLFilter(html: string | null | undefined): Promise<[string, number]> {
    if (!html) { return ['', 0]; }
    const allowedTags = new Set(['a', 'b', 'i', 'u', 'font', 'strong', 'em', 'strike', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'menu', 'multicol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'p', 'div', 'pre', 'br', 'img', 'video', 'audio', 'code', 'blockquote', 'iframe', 'section']);
    const allowedAttrs = new Set(['target', 'href', 'src', 'alt', 'rel', 'width', 'height', 'size', 'border', 'align', 'colspan', 'rowspan', 'cite']);
    let length = 0;
    return [await new HTMLRewriter().on("*", {
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
        },
        text: t => {
            length += t.text.replace(/&nbsp;/g, " ").trim().length;
        },
    }).transform(new Response(html, { headers: { "Content-Type": "text/html" } })).text(), length]
}

export async function HTMLText(html: string | null | undefined, len = 0, first = false) {
    if (!html) { return ''; }
    let text = '';
    let stop = false;
    let pregap = false;
    await new HTMLRewriter().on('*', {
        element: e => {
            if (stop) { return; }
            if (['p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(e.tagName)) {
                // 如果只取首行 且遇到换行符 则标签结束时停止
                if (first) {
                    e.onEndTag(() => {
                        // 有文字再结束
                        if (text) { stop = true }
                    })
                } else {
                    // 在新段落前空行
                    pregap = true;
                }
            }
        },
        text: t => {
            if (stop || !t.text.trim()) { return; }
            // 本元素开头是空格
            if (/\s/.test(t.text.at(0) ?? '')) { pregap = true; }
            // 本元素拼接到字符串
            text += (pregap ? ' ' : '') + t.text
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, " ")
                .trim()
            // 字符串大于指定长度则停止
            if (text.length >= len) {
                if (text.length > len) {
                    text = text.slice(0, len - 3) + '...';
                }
                stop = true;
                return;
            }
            // 记录本元素结尾是否是空格
            pregap = /\s/.test(t.text.at(-1) ?? '')
        },
    }).transform(new Response(html, { headers: { "Content-Type": "text/html" } })).text();
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#39;")
        .trim()
        || '...'
}

export function URLQuery(a: Context, newParams: { [key: string]: string }) {
    const allow = ['page', 'user'];
    const oldParams = a.req.query();
    const query = new URLSearchParams();
    for (let key of allow) {
        // 优先使用新参数覆盖老参数
        if (key in newParams) {
            // 增加或覆盖参数
            if (newParams[key]) {
                query.append(key, newParams[key]);
            }
            // 参数被删除（传入空白字符串）
            continue;
        }
        // 新参数没有时再继承老参数
        if (key in oldParams) {
            query.append(key, oldParams[key]);
        }
    }
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

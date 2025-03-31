import { html, raw } from "hono/html";
import { HTMLText, URLQuery } from "../app/core";
import { PListProps } from "../app/pList";
import { Header, Footer } from "./Common"

export function PList(z: PListProps) {
    z.head_external = raw(`
        <link href="/quill.snow.css" rel="stylesheet" />
        <style>
            .content a {
                text-decoration: underline;
            }
            pre {
                white-space: pre-wrap;
            }
            .content img {
                padding: 4px 0;
            }
        </style>
    `);
    return html`
${Header(z)}

<div class="container mx-auto max-w-5xl lg:px-0">
    <div class="flex flex-col gap-4">
        ${z.data.map(item => html`
            <div id="p${item.pid}" class="card bg-base-100 shadow-sm">
                <div class="card-body p-4">
                    ${item.quote_name ? html`
                    <blockquote class="bg-base-200 px-4 py-3 rounded-lg mb-6">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="badge badge-neutral">${raw(item.quote_name)}</div>
                            <div class="text-sm opacity-70">引用</div>
                        </div>
                        <div class="text-sm opacity-80 break-all break-words hyphens-auto">
                            ${raw(HTMLText.all(item.quote_content, 100))}
                        </div>
                    </blockquote>
                    ` : ''}
                    <div class="content prose max-w-none mb-1 break-all break-words hyphens-auto">
                        ${raw(item.content)}
                    </div>
                    <div class="divider my-0"></div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm pt-2">
                        <a href="/?uid=${item.uid}" target="_blank" class="link link-hover flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            ${item.name}
                        </a>
                        <span class="flex items-center gap-2 opacity-70">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="date whitespace-nowrap" time_stamp="${item.time}"></span>
                        </span>
                        ${(z.i) ? html`
                            <div class="flex-1"></div>
                            <div class="flex flex-wrap gap-1">
                                ${(z.i.gid == 1 && !item.tid) ? html`
                                    <button class="btn btn-sm btn-ghost ${z.thread.is_top ? 'btn-active' : ''}" onclick="pin(${item.pid});">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                        置顶
                                    </button>
                                `: ''}
                                ${(z.i.gid == 1 || z.i.uid == item.uid) ? html`
                                    <a href="/e/-${item.pid}" class="btn btn-sm btn-ghost">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        编辑
                                    </a>
                                    <button class="btn btn-sm btn-ghost btn-error" onclick="omit(-${item.pid});">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        删除
                                    </button>
                                `: ''}
                                <a href="/e/${item.pid}" class="btn btn-sm btn-ghost">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    回复
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `)}
    </div>

    ${z.data.length ? html`
        <div class="flex justify-center mt-8">
            <div class="flex flex-wrap gap-1">
                ${z.pagination.map(item => html`
                    ${item ? html`
                        <a href="/t/${z.thread.tid}/${item}${URLQuery(z.a)}" class="btn btn-sm ${item == z.page ? 'btn-active' : 'btn-ghost'}">${item}</a>
                    ` : html`
                        <span class="btn btn-sm btn-ghost">...</span>
                    `}
                `)}
            </div>
        </div>
    `: ''}
</div>

<script>
window.addEventListener("load", function () {
    const search = window.location.search;
    if (search) {
        const target = document.querySelector('#p'+search.substring(1));
        if (target) {
            target.style.scrollMarginTop = "80px"; // 设置滚动边距
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
});
</script>

${Footer(z)}
    `;
}
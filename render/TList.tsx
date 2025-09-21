import { Context } from "hono";
import { html, raw } from "hono/html";
import { Header, Footer } from "./Common";
import { HTMLText, URLQuery } from "../src/core";
import { tListProps } from "../src/tListProps";

export function TList(a: Context, z: tListProps) {
    return html`
${Header(a, z)}

<div class="max-w-5xl mx-auto">

    <!-- 帖子列表 -->
    <div class="lg:px-0">
        ${z.data.map(async item => html`
            <a href="/t/${item.pid}" class="block card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 mb-4">
                <div class="card-body p-4">
                    <div class="flex flex-wrap items-start gap-4">
                        <!-- 左侧信息 -->
                        <div class="flex-1 min-w-0 overflow-hidden">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                ${item.attr ? html`
                                    <div class="badge badge-primary badge-sm lg:badge-md flex-shrink-0">置顶</div>
                                ` : ''}
                                <h2 class="min-w-0 flex-1 card-title text-base hover:text-primary line-clamp-3 break-words">
                                    ${raw(await HTMLText(item.content, 140, true))}
                                </h2>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-base-content/70">
                                <div class="flex items-center gap-2 min-w-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span class="truncate max-w-[120px] role_${item.grade}">${item.name}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="date whitespace-nowrap" time_stamp="${item.time}"></span>
                                </div>
                                ${item.last_time ? html`
                                    <div class="flex items-center gap-2 w-full sm:w-auto min-w-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                        <span class="truncate">最后回复: <span class="role_${item.last_grade}">${item.last_name}</span></span>
                                        <span class="date whitespace-nowrap flex-shrink-0" time_stamp="${item.last_time}"></span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        `)}
    </div>

    <!-- 分页 -->
    ${z.data.length ? html`
        <div class="flex justify-center mt-8">
            <div class="join shadow-sm">
                ${z.pagination.map(item => html`
                    ${item ? html`
                        <a href="/${URLQuery(a, { 'page': item.toString() })}" 
                           class="join-item btn btn-sm ${item == z.page ? 'btn-primary' : 'btn-ghost'}">${item ? item : '...'}</a>
                    ` : html`
                        <span class="join-item btn btn-sm btn-ghost">...</span>
                    `}
                `)}
            </div>
        </div>
    `: html`
        <div class="hero min-h-[300px] bg-base-100 rounded-lg shadow-sm mx-4 lg:mx-0">
            <div class="hero-content text-center">
                <div class="max-w-md">
                    <h2 class="text-xl lg:text-2xl font-bold mb-4">暂无内容</h2>
                    <p class="text-base-content/60 mb-6">还没有任何帖子，来发表第一个帖子吧！</p>
                    ${!z.thread_lock ? html`
                        <a href="/e" class="btn btn-primary gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            发帖
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `}
</div>

${Footer(a, z)}
`
        ;
}
import { html, raw } from "hono/html";
import { HTMLText, URLQuery } from "../app/base";
import { PListProps } from "../app/pList";
import { Header, Footer } from "./Common"

export function PList(z: PListProps) {
    return html`
        ${Header(z)}
        <main class="container">
            <div class="post-list">
                ${z.data.map(item => html`
                <div class="post-item" id="p${item.pid}" style="${(item.pid > z.pid) ? 'background:#FFF0F5' : ''}">
                    <div class="post-info">
                        ${item.quote_pid ? html`
                        <blockquote class="blockquote">
                            ${raw(item.quote_name)}: ${raw(HTMLText(item.quote_content, 140))}
                        </blockquote>
                        ` : ''}
                        ${raw(item.content)}
                    </div>
                    <div class="post-meta">
                        <span class="author">${item.name}</span>
                        <span class="date" time_stamp="${item.create_date}"></span>
                            ${(z.i) ? html`
                            ${(z.i.uid == item.uid) ? html`
                            <a class="edit" href="/e/-${item.pid}">编辑</a>
                            `: ''}
                            <a class="reply" href="/e/${item.pid}">回复</a>
                            `: ''}
                    </div>
                </div>
                `)}
            </div>
            <div class="pagination">
                ${z.pagination.map(item => html`
                <a ${item ? html`href="/t/${z.topic.tid}/${item}${URLQuery(z.a)}"` : ''} class="page-btn ${item == z.page ? 'active' : ''}">${item ? item : '...'}</a>
                `)}
            </div>
        </main>
        ${Footer(z)}
    `;
}
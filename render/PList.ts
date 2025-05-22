import { Context } from "hono";
import { html, raw } from "hono/html";
import { Header, Footer } from "./Common";
import { HTMLText, URLQuery } from "../src/core";
import { PListProps } from "../src/post";

// 预定义颜色调色板（移至顶层避免重复创建）
const AVATAR_COLORS = [
    'hsl(4, 90%, 58%)',    // 红色
    'hsl(340, 82%, 52%)',  // 玫红
    'hsl(262, 67%, 58%)',  // 紫色
    'hsl(210, 90%, 60%)',  // 蓝色
    'hsl(199, 98%, 48%)',  // 青色
    'hsl(162, 73%, 46%)',  // 绿色
    'hsl(141, 78%, 42%)',  // 浅绿
    'hsl(39, 100%, 50%)',  // 橙色
    'hsl(27, 96%, 61%)',   // 橘色
    'hsl(15, 86%, 57%)'    // 红橙
];

// 根据字符串生成一致的颜色
function generateColorFromString(str: string | null): string {
    if (!str) return AVATAR_COLORS[0]; // 默认颜色

    // 简化的哈希算法
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 3) - hash);
    }

    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// 获取用户名的首字母
function getInitials(name: string | null): string {
    if (!name) return '?';
    // 直接返回首字符并大写（适用于中英文）
    return name.charAt(0).toUpperCase();
}

export function PList(a: Context, z: PListProps) {
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
                cursor: pointer;
                transition: opacity 0.2s ease;
            }
            .content img:hover {
                opacity: 0.9;
            }
            .image-preview-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.9);
                transition: opacity 0.3s ease;
            }
            .image-preview-content {
                margin: auto;
                display: block;
                max-width: 90%;
                max-height: 90%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 20px rgba(0,0,0,0.3);
            }
            .image-preview-close {
                position: absolute;
                top: 15px;
                right: 35px;
                color: #f1f1f1;
                font-size: 40px;
                font-weight: bold;
                cursor: pointer;
            }
            .avatar-letter {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                color: white;
                font-weight: 500;
            }
            .avatar-letter span {
                font-size: 1rem;
                line-height: 1;
                position: relative;
                top: 1px;
            }
            .ql-toolbar.ql-snow {
                border-top-left-radius: 0.5rem;
                border-top-right-radius: 0.5rem;
                background: #f8f9fa;
                border-color: #e2e8f0;
            }
            .ql-container.ql-snow {
                border-bottom-left-radius: 0.5rem;
                border-bottom-right-radius: 0.5rem;
                border-color: #e2e8f0;
            }
            .ql-editor,.ql-container {
                height: 260px;
            }
            .ql-container {
                padding: 0;
            }
            .ql-editor img {
                padding: 4px 0;
            }
        </style>
    `);
    return html`
${Header(a, z)}

<div class="container mx-auto max-w-5xl lg:px-0">
    <div class="flex flex-col gap-4">
        ${z.data.map(async item => html`
            <div id="p${item.pid}" class="card bg-base-100 shadow-sm">
                <div class="card-body p-4">
                    ${item.quote_name ? html`
                    <blockquote class="bg-base-200 px-4 py-3 rounded-lg mb-6">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="badge badge-neutral">${raw(item.quote_name)}</div>
                            <div class="text-sm opacity-70">引用</div>
                        </div>
                        <div class="text-sm opacity-80 break-all break-words hyphens-auto">
                            ${raw(await HTMLText(item.quote_content, 100))}
                        </div>
                    </blockquote>
                    ` : ''}
                    <div class="content prose max-w-none mb-1 break-all break-words hyphens-auto">
                        ${raw(item.content)}
                    </div>
                    <div class="divider my-0"></div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm pt-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <a href="/?uid=${item.uid}" target="_blank" class="flex-shrink-0">
                                <div class="avatar-letter" style="background-color: ${generateColorFromString(item.name)}">
                                    <span>${getInitials(item.name)}</span>
                                </div>
                            </a>
                            <a href="/?uid=${item.uid}" target="_blank" class="link link-hover truncate max-w-[120px]">
                                ${item.name || '(匿名)'}
                            </a>
                        </div>
                        <span class="flex items-center gap-2 opacity-70">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span class="date whitespace-nowrap" time_stamp="${item.time}"></span>
                        </span>
                        ${(z.i) ? html`
                            <div class="flex-1"></div>
                            <div class="flex flex-wrap gap-1">
                                ${(z.i.gid == 1 && item.pid == item.tid) ? html`
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
                        <a href="/t/${z.thread.tid}/${item}${URLQuery(a)}" class="btn btn-sm ${item == z.page ? 'btn-active' : 'btn-ghost'}">${item}</a>
                    ` : html`
                        <span class="btn btn-sm btn-ghost">...</span>
                    `}
                `)}
            </div>
        </div>
    `: ''}
    
    ${z.i ? html`
        <div class="card bg-base-100 shadow-sm mt-8">
            <div class="card p-4">
                <div name="content"></div>
                <div class="flex justify-end mt-2">
                    <button class="btn btn-primary" onclick="post(${z.thread.tid},true)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        发送
                    </button>
                </div>
            </div>
        </div>
    ` : ''}
</div>

<script src="/quill.js"></script>
<script>
    const quill = new Quill('[name="content"]', {
        modules: {
            toolbar: [{ 'header': [1, 2, 3, 4, 5, 6, false] }, 'bold', 'italic', 'underline', 'code-block', 'link', 'image', 'clean']
        },
        theme: 'snow',
        placeholder: '请输入内容...'
    });
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', upload);
</script>

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

    // 创建图片预览模态框
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    const modalImg = document.createElement('img');
    modalImg.className = 'image-preview-content';
    const closeBtn = document.createElement('span');
    closeBtn.className = 'image-preview-close';
    closeBtn.innerHTML = '&times;';
    modal.appendChild(modalImg);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // 为所有内容中的图片添加点击事件
    document.querySelectorAll('.content img').forEach(img => {
        img.addEventListener('click', function() {
            modal.style.display = 'block';
            modalImg.src = this.src;
        });
    });
    
    // 点击关闭按钮或者模态框背景关闭预览
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

});
</script>

${Footer(a, z)}
    `;
}
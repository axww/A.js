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
    
    ${z.i ? html`
        <div class="card bg-base-100 shadow-sm mt-8">
            <div class="card-body p-4">
                <h3 class="text-lg font-semibold mb-2">快速回复</h3>
                <div class="form-control">
                    <textarea id="quickReplyContent" class="textarea textarea-bordered h-24" placeholder="输入简短回复内容..."></textarea>
                </div>
                <div class="flex justify-end mt-2">
                    <button id="submitQuickReply" class="btn btn-primary">
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
    
    // 快速回复功能
    const quickReplyBtn = document.getElementById('submitQuickReply');
    if (quickReplyBtn) {
        quickReplyBtn.addEventListener('click', function() {
            const content = document.getElementById('quickReplyContent').value.trim();
            if (!content) {
                alert('请输入回复内容');
                return;
            }
            
            // 显示加载状态
            quickReplyBtn.classList.add('btn-disabled');
            quickReplyBtn.innerHTML = '<span class="loading loading-spinner"></span> 发送中...';
            
            // 获取CSRF令牌
            const csrfMetaTag = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMetaTag ? csrfMetaTag.getAttribute('content') : '';
            
            // 发送快速回复请求
            fetch('/api/quick-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken || ''
                },
                body: JSON.stringify({
                    tid: ${z.thread.tid},
                    content: content
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 成功后刷新页面显示新回复
                    window.location.reload();
                } else {
                    alert(data.message || '回复失败，请稍后再试');
                    resetButtonState();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('回复失败，请稍后再试');
                resetButtonState();
            });
            
            // 重置按钮状态函数
            function resetButtonState() {
                quickReplyBtn.classList.remove('btn-disabled');
                quickReplyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> 发送';
            }
        });
    }
});
</script>

${Footer(z)}
    `;
}
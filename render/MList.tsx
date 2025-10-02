import { Context } from "hono";
import { html } from "hono/html";
import { Props } from "../src/base";
import { Header, Footer } from "./Common";

export function MList(a: Context, z: Props) {
    if (!z.i) {
        // 当用户未登录时，自动重定向到登录页面
        return html`
    <script>
      window.location.href = '/auth';
    </script>
    `;
    }

    return html`
${Header(a, z)}

<div class="container mx-auto max-w-5xl lg:px-0 py-6">
    <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold">消息通知</h1>
            <button class="btn btn-outline btn-error btn-sm" id="clear-btn">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清空全部消息
            </button>
        </div>
        
        <div id="notification-empty" class="card bg-base-100 shadow-sm p-8 text-center hidden">
            <div class="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p class="text-gray-500">暂无消息通知</p>
            </div>
        </div>
        
        <div id="list" class="flex flex-col gap-4"></div>
        
        <div class="flex justify-center mt-4">
            <button id="load" class="btn btn-outline btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                加载更多
            </button>
        </div>
    </div>
</div>

<script>
let messageCount = 0;
let show_time = 0;
let last_read = ${z.i.last_read};

async function mClear() {
    try {
        if (!confirm('确定要清空所有消息吗？此操作不可恢复。')) {
            return;
        }
        
        // 调用API清空消息
        const response = await fetch('/mClear');
        
        // 检查响应状态
        if (response.status === 401) {
            // 未授权，重定向到登录页
            window.location.href = '/auth';
            return;
        }
        
        if (!response.ok) {
            throw new Error('网络请求失败: ' + response.status);
        }
        
        location.reload(); 
    } catch (error) {
        console.error('清空消息失败:', error);
    }
}

document.getElementById('clear-btn').addEventListener('click', mClear);

// 异步加载消息列表
async function mFetch() {
    try {
        const list = document.getElementById('list');
        const loadBtn = document.getElementById('load');
        
        // 显示加载状态
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> 加载中...';
        
        // 调用API，获取所有消息
        const response = await fetch('/mData?show_time='+show_time);
        
        // 检查响应状态
        if (response.status === 401) {
            // 未授权，重定向到登录页
            window.location.href = '/auth';
            return;
        }
        
        if (!response.ok) {
            throw new Error('网络请求失败: ' + response.status);
        }
        
        const data = await response.json();

        // 恢复按钮状态
        loadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg> 加载更多';
        loadBtn.disabled = false;
        
        if (data.length) {
            show_time = data.at(-1).post_time;
            messageCount += data.length;
            
            // 分离新消息和已读消息
            const newMessages = data.filter(row => row.post_time > last_read);
            const readMessages = data.filter(row => row.post_time <= last_read);

            // 如果是第一页加载且有未读消息，显示未读消息标题
            if (messageCount === data.length && newMessages.length > 0) {
                const newMessagesHeader = document.createElement('h2');
                newMessagesHeader.className = 'text-lg font-semibold mt-2 mb-3 text-primary';
                newMessagesHeader.textContent = '新消息';
                list.appendChild(newMessagesHeader);
            }
            
            // 添加新消息
            newMessages.forEach(function(row){
                addMessageCard(row, list, 'new');
            });
            
            // 如果是第一页加载且有已读消息，显示已读消息标题
            if (messageCount === data.length && readMessages.length > 0) {
                const readMessagesHeader = document.createElement('h2');
                readMessagesHeader.className = 'text-lg font-semibold mt-6 mb-3 text-base-content opacity-70';
                readMessagesHeader.textContent = '历史消息';
                list.appendChild(readMessagesHeader);
            }
            
            // 添加已读消息
            readMessages.forEach(function(row){
                addMessageCard(row, list, 'read');
            });
        } else {
            loadBtn.style.display = 'none';
            
            if (messageCount === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'text-center p-6 bg-base-100 rounded-box shadow-sm';
                emptyMsg.innerHTML = '<div class="text-3xl mb-2">📭</div><div>暂无消息通知</div>';
                list.appendChild(emptyMsg);
            } else {
                const endMsg = document.createElement('div');
                endMsg.className = 'text-center text-sm opacity-60 my-4';
                endMsg.textContent = '--- 已经到底了 ---';
                list.appendChild(endMsg);
            }
        }
    } catch (error) {
        console.error('加载失败:', error);
        loadBtn.disabled = false;
        loadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg> 重试加载';
    }
}

// 添加消息卡片函数
function addMessageCard(row, list, messageType) {
    const timeAgo = getTimeAgo(row.post_time);
    const card = document.createElement('div');
    
    // 为已读消息添加特殊样式
    if (messageType === 'read') {
        card.className = 'card border border-base-300 bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-200 mb-3';
    } else {
        card.className = 'card bg-base-100 shadow hover:shadow-md transition-shadow duration-200 mb-3';
    }
    
    card.setAttribute('data-pid', row.post_pid);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body p-4';
    
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 mb-1';
    
    // 只在新消息中显示"新回复"标签
    if (messageType === 'new') {
        const badge = document.createElement('div');
        badge.className = 'badge badge-primary';
        badge.textContent = '新回复';
        header.appendChild(badge);
    } else {
        // 为历史消息添加一个已读标识
        const readBadge = document.createElement('div');
        readBadge.className = 'badge badge-ghost badge-sm';
        readBadge.textContent = '已读';
        header.appendChild(readBadge);
    }
    
    const time = document.createElement('div');
    time.className = 'text-sm opacity-70';
    time.textContent = timeAgo;
    
    header.appendChild(time);
    cardBody.appendChild(header);
    
    if (row.quote_content) {
        const blockquote = document.createElement('blockquote');
        
        // 为已读消息调整引用块样式
        if (messageType === 'read') {
            blockquote.className = 'bg-neutral-content bg-opacity-30 px-4 py-2 rounded-lg mb-2 border-l-4 border-neutral';
        } else {
            blockquote.className = 'bg-base-200 px-4 py-3 rounded-lg mb-3';
        }
        
        const quoteText = document.createElement('div');
        quoteText.className = 'text-sm opacity-80 break-all break-words hyphens-auto';
        quoteText.textContent = row.quote_content;
        
        blockquote.appendChild(quoteText);
        cardBody.appendChild(blockquote);
    }
    
    const link = document.createElement('a');
    link.href = '/p?tid=' + row.post_tid + '&time=' + row.post_time;
    link.className = 'group';
    link.target = '_blank';
    
    // 添加点击事件，标记消息为已读
    link.addEventListener('click', function() {
        markAsRead(row.post_pid);
    });
    
    const content = document.createElement('div');
    content.className = 'flex items-start gap-2';
    
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'flex-shrink-0';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar placeholder';
    
    const avatarInner = document.createElement('div');
    avatarInner.className = 'bg-neutral-focus text-neutral-content rounded-full w-8';
    
    const initial = document.createElement('span');
    initial.textContent = row.post_name ? row.post_name.charAt(0).toUpperCase() : '?';
    
    avatarInner.appendChild(initial);
    avatar.appendChild(avatarInner);
    avatarContainer.appendChild(avatar);
    content.appendChild(avatarContainer);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'flex-1';
    
    const userName = document.createElement('div');
    userName.className = 'font-semibold';
    userName.textContent = row.post_name;
    
    const postContent = document.createElement('div');
    postContent.className = 'mt-1 text-sm group-hover:text-primary transition-colors duration-200';
    postContent.textContent = row.post_content;
    
    textContainer.appendChild(userName);
    textContainer.appendChild(postContent);
    content.appendChild(textContainer);
    
    link.appendChild(content);
    cardBody.appendChild(link);
    card.appendChild(cardBody);
    
    list.appendChild(card);
}

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    const secondsAgo = Math.floor(Date.now() / 1000) - timestamp;
    if (secondsAgo < 60) {
        return '刚刚';
    } else if (secondsAgo < 3600) {
        return Math.floor(secondsAgo / 60) + '分钟前';
    } else if (secondsAgo < 86400) {
        return Math.floor(secondsAgo / 3600) + '小时前';
    } else if (secondsAgo < 2592000) {
        return Math.floor(secondsAgo / 86400) + '天前';
    } else {
        const date = new Date(timestamp * 1000);
        return date.getFullYear() + '-' + 
               ('0' + (date.getMonth() + 1)).slice(-2) + '-' + 
               ('0' + date.getDate()).slice(-2);
    }
}

// 初始加载
mFetch();

// 为加载更多按钮添加点击事件
document.getElementById('load').addEventListener('click', mFetch);
</script>

${Footer(a, z)}
`;
}
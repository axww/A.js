import { Context } from "hono";
import { html, raw } from "hono/html";
import { Props } from "../src/base";
import { Config } from "../src/core";

export async function Header(a: Context, z: Props) {

  return html`
<!DOCTYPE HTML>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${z.title}</title>
  <meta name="keywords" content="${z.keywords ?? await Config.get<string>(a, 'site_keywords', false)}">
  <meta name="description" content="${raw(z.description ?? await Config.get<string>(a, 'site_description', false))}">
  <meta name="robots" content="index, follow">
  <link rel="stylesheet" type="text/css" href="/a.css" />
  <script type="text/javascript" src="/a.js"></script>
  ${z.head_external ?? ''}
</head>
<body class="min-h-screen bg-base-200">
<div class="drawer">
  <input id="drawer-toggle" type="checkbox" class="drawer-toggle" />
  <div class="drawer-content flex flex-col min-h-screen">
    <!-- Navbar -->
    <div class="w-full navbar bg-base-100 shadow-sm sticky top-0 z-30">
      <div class="container mx-auto px-4">
        <div class="flex-none lg:hidden">
          <label for="drawer-toggle" class="btn btn-square btn-ghost drawer-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </label>
        </div>
        <div class="flex flex-1 px-2">
          <a href="/" class="btn btn-ghost text-base normal-case">${await Config.get<string>(a, 'site_name', false)}</a>
          ${Object.values(await Config.get<{ url: string; name: string; }[]>(a, 'site_navi', false) ?? []).map(item => html`
          <a href="${item.url}" class="btn btn-ghost text-base normal-case">${item.name}</a>
          `)}
        </div>
        <div class="flex-none hidden lg:block">
          <ul class="menu menu-horizontal gap-2 items-center">
            <!-- 导航菜单 -->
            ${z.i ? html`
              <li><a href="/e" class="btn btn-sm btn-ghost gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                发帖
              </a></li>
              <li><a href="/m" class="btn btn-sm ${(z.i.last_call > z.i.last_read) ? 'btn-error' : 'btn-ghost'} gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                通知
              </a></li>
              <li><a href="/i" class="btn btn-sm btn-ghost gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </a></li>
              <li><a href="javascript:logout();" class="btn btn-sm btn-ghost gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出
              </a></li>
            `: html`
              <li><a href="/auth" class="btn btn-sm btn-primary gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                登录
              </a></li>
            `}
          </ul>
        </div>
      </div>
    </div>
    <!-- 主要内容区域 -->
    <main class="flex-grow container mx-auto px-4 py-6">
    `
}

export async function Footer(a: Context, z: Props) {
  return html`
    </main>
    <!-- Footer -->
    <footer class="footer footer-center p-4 bg-base-100 text-base-content border-t">
      <div class="flex flex-col items-center gap-2">
        <div class="flex flex-wrap justify-center gap-x-4 gap-y-1">
          ${Object.values(await Config.get<{ url: string; name: string; }[]>(a, 'site_link', false) ?? []).map(item => html`
            <a href="${item.url}" target="_blank" class="link link-hover text-sm text-base-content/70 hover:text-primary">${item.name}</a>
          `)}
        </div>
        <p class="text-sm opacity-50">
          <a href="https://github.com/axww/A.js" target="_blank">A.js</a>
          <a href="https://github.com/asisyu" target="_blank">AsisYu</a>
          <a href="https://github.com/Kutinana" target="_blank">Kutinana</a>
          <a href="https://www.dogyun.com/" target="_blank">DogYun</a>
        </p>
      </div>
    </footer>
    </div>
    <!-- 侧边抽屉菜单 -->
    <div class="drawer-side z-40">
      <label for="drawer-toggle" class="drawer-overlay"></label>
      <div class="menu p-4 w-80 min-h-full bg-base-100">
        <!-- 抽屉标题 -->
        <div class="font-bold text-lg mb-4 px-4">${await Config.get<string>(a, 'site_name', false)}</div>
        <!-- 抽屉菜单项 -->
        <ul class="menu menu-lg gap-2">
          ${z.i ? html`
            <li>
              <a href="/e" class="gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                发帖
              </a>
            </li>
            <li>
              <a href="/m" class="gap-4 ${(z.i.last_call > z.i.last_read) ? 'text-error' : ''}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                通知
              </a>
            </li>
            <li>
              <a href="/i" class="gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </a>
            </li>
            <li>
              <a href="javascript:logout();" class="gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出
              </a>
            </li>
          `: html`
            <li>
              <a href="/auth" class="gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                登录
              </a>
            </li>
          `}
        </ul>
      </div>
    </div>
</div>

<script>
    async function logout() {
        if ((await fetch(new Request("/logout", {method: "POST"}))).ok) {
            if (location.pathname == "/i") {
                location.href = "/auth";
            }else{
                location.reload();
            }
        }
    }
    window.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.date').forEach(element => {
            element.innerHTML = new Date(parseInt(element.getAttribute('time_stamp'))*1000)
                                    .toLocaleString(undefined,{
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    });
        });
    });
</script>
</body>
</html>
    `
}
import { Context } from "hono";
import { html } from "hono/html";
import { Header, Footer } from "./Common";
import { Props } from "../src/base";
import { Config } from "../src/core";

export async function UAuth(a: Context, z: Props) {
  return html`
${Header(a, z)}

<div class="flex flex-col justify-center px-6 lg:px-8 h-full">
    <form class="space-y-8 sm:mx-auto sm:w-full sm:max-w-sm" onsubmit="auth(this);">
      <div class="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 class="text-center text-2xl/9 font-bold tracking-tight text-gray-900">${await Config.get<string>(a, 'site_name', true)}</h2>
      </div>
      <div>
        <input type="text" name="acct" placeholder="邮箱" required class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 mb-2">
        <input type="password" name="pass" placeholder="密码" required class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6">
      </div>
      <div class="text-center">
        <button type="submit" name="login" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer">登录/注册</button>
      </div>
    </form>
</div>

<script>
    // 祖传大坨MD5
    function md5(r){function n(r,n){var t=(65535&r)+(65535&n);return(r>>16)+(n>>16)+(t>>16)<<16|65535&t}function t(r,t,u,e,a,c){var f=n(n(t,r),n(e,c));return n(f<<a|f>>>32-a,u)}function u(r,n,u,e,a,c,f){return t(n&u|~n&e,r,n,a,c,f)}function e(r,n,u,e,a,c,f){return t(n&e|u&~e,r,n,a,c,f)}function a(r,n,u,e,a,c,f){return t(n^u^e,r,n,a,c,f)}function c(r,n,u,e,a,c,f){return t(u^(n|~e),r,n,a,c,f)}for(var f=Array(),o=8*r.length,i=1732584193,h=-271733879,v=-1732584194,A=271733878,d=0;d<o;d+=8)f[d>>5]|=(255&r.charCodeAt(d/8))<<d%32;f[o>>5]|=128<<o%32,f[14+(o+64>>>9<<4)]=o;for(d=0;d<f.length;d+=16){var g=i,l=h,y=v,b=A;h=c(h=c(h=c(h=c(h=a(h=a(h=a(h=a(h=e(h=e(h=e(h=e(h=u(h=u(h=u(h=u(h,v=u(v,A=u(A,i=u(i,h,v,A,f[d+0],7,-680876936),h,v,f[d+1],12,-389564586),i,h,f[d+2],17,606105819),A,i,f[d+3],22,-1044525330),v=u(v,A=u(A,i=u(i,h,v,A,f[d+4],7,-176418897),h,v,f[d+5],12,1200080426),i,h,f[d+6],17,-1473231341),A,i,f[d+7],22,-45705983),v=u(v,A=u(A,i=u(i,h,v,A,f[d+8],7,1770035416),h,v,f[d+9],12,-1958414417),i,h,f[d+10],17,-42063),A,i,f[d+11],22,-1990404162),v=u(v,A=u(A,i=u(i,h,v,A,f[d+12],7,1804603682),h,v,f[d+13],12,-40341101),i,h,f[d+14],17,-1502002290),A,i,f[d+15],22,1236535329),v=e(v,A=e(A,i=e(i,h,v,A,f[d+1],5,-165796510),h,v,f[d+6],9,-1069501632),i,h,f[d+11],14,643717713),A,i,f[d+0],20,-373897302),v=e(v,A=e(A,i=e(i,h,v,A,f[d+5],5,-701558691),h,v,f[d+10],9,38016083),i,h,f[d+15],14,-660478335),A,i,f[d+4],20,-405537848),v=e(v,A=e(A,i=e(i,h,v,A,f[d+9],5,568446438),h,v,f[d+14],9,-1019803690),i,h,f[d+3],14,-187363961),A,i,f[d+8],20,1163531501),v=e(v,A=e(A,i=e(i,h,v,A,f[d+13],5,-1444681467),h,v,f[d+2],9,-51403784),i,h,f[d+7],14,1735328473),A,i,f[d+12],20,-1926607734),v=a(v,A=a(A,i=a(i,h,v,A,f[d+5],4,-378558),h,v,f[d+8],11,-2022574463),i,h,f[d+11],16,1839030562),A,i,f[d+14],23,-35309556),v=a(v,A=a(A,i=a(i,h,v,A,f[d+1],4,-1530992060),h,v,f[d+4],11,1272893353),i,h,f[d+7],16,-155497632),A,i,f[d+10],23,-1094730640),v=a(v,A=a(A,i=a(i,h,v,A,f[d+13],4,681279174),h,v,f[d+0],11,-358537222),i,h,f[d+3],16,-722521979),A,i,f[d+6],23,76029189),v=a(v,A=a(A,i=a(i,h,v,A,f[d+9],4,-640364487),h,v,f[d+12],11,-421815835),i,h,f[d+15],16,530742520),A,i,f[d+2],23,-995338651),v=c(v,A=c(A,i=c(i,h,v,A,f[d+0],6,-198630844),h,v,f[d+7],10,1126891415),i,h,f[d+14],15,-1416354905),A,i,f[d+5],21,-57434055),v=c(v,A=c(A,i=c(i,h,v,A,f[d+12],6,1700485571),h,v,f[d+3],10,-1894986606),i,h,f[d+10],15,-1051523),A,i,f[d+1],21,-2054922799),v=c(v,A=c(A,i=c(i,h,v,A,f[d+8],6,1873313359),h,v,f[d+15],10,-30611744),i,h,f[d+6],15,-1560198380),A,i,f[d+13],21,1309151649),v=c(v,A=c(A,i=c(i,h,v,A,f[d+4],6,-145523070),h,v,f[d+11],10,-1120210379),i,h,f[d+2],15,718787259),A,i,f[d+9],21,-343485551),i=n(i,g),h=n(h,l),v=n(v,y),A=n(A,b)}var m=Array(i,h,v,A),C="0123456789abcdef",j="";for(d=0;d<4*m.length;d++)j+=C.charAt(m[d>>2]>>d%4*8+4&15)+C.charAt(m[d>>2]>>d%4*8&15);return j}
    async function auth(form) {
        event.preventDefault();
        if (event.submitter.name == "login") { // 登录
          if (!form.querySelector('input[name="acct"]').value) {
            alert("邮箱地址为空");
            return;
          }
          if (!form.querySelector('input[name="pass"]').value) {
            alert("密码为空");
            return;
          }
        } else { // 注册
          if (!form.querySelector('input[name="acct"]').value) {
            alert("邮箱地址为空");
            return;
          }
          if (
            !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/.test(
              form.querySelector('input[name="acct"]').value
            )
          ) {
            alert("邮箱格式错误");
            return;
          }
          if (!form.querySelector('input[name="pass"]').value) {
            alert("密码为空");
            return;
          }
        }
        const data = new FormData(form);
        data.set('pass', md5(data.get('pass')));
        if (
          (
            await fetch(
              new Request("/login", {method: 'POST', body: data})
            )
          ).ok
        ) {
          window.location = document.referrer;
        } else {
          const response = await fetch(
            new Request("/login", { method: "POST", body: data })
          );
          const text = await response.text();
          if (text === "no user") {
            // 用户不存在 进行注册操作
            const data = new FormData(form);
            if (!data.get('acct')) {alert('邮箱地址为空');return;}
            if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.get('acct'))) {alert('邮箱格式错误');return;}
            data.set('pass', md5(data.get('pass')));
            if ((await fetch(new Request('/register', {method: 'POST', body: data}))).ok) {
                window.location='/i';
            } else { alert('注册失败，内部错误'); }
          } else {
            alert("登录失败");
          }
        }
      }
</script>

${Footer(a, z)}
`;
}
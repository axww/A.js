import { html } from "hono/html";
import { Header, Footer } from "./Common"
import { Props } from "../app/base";

export function MList(z: Props) {
    return html`
${Header(z)}

<button onclick="mClear()">【清空消息】</button>
<div id="list"></div>
<a id="load" href="javascript:;" onclick="mFetch(this);">【加载更多】</a>

<script>
let pid = 0;
async function mClear() {
    const response = await fetch('/_mClear');
    if (response.ok) { location.reload(); }
}
async function mFetch() {
    try {
        const response = await fetch('/_mList?type=1&pid='+pid);
        const data = await response.json();
        if (data.length) {
            pid = data.at(-1).post_pid;
        } else {
            document.getElementById('load').style.display = 'none';
        }
        data.forEach(function(row){
            let html = ''
            html += '<div class="message" pid="'+row.post_pid+'">';
            html += '<i style="color:grey;font-size:10px;">'+row.quote_content+'</i><br />';
            html += '<a href="/p?tid='+row.post_tid+'&pid='+row.post_pid+'" target="_blank">';
            html += '<b>'+row.post_name+'</b>: ';
            html += row.post_content;
            html += '</a>';
            html += '</div><hr />'
            document.getElementById('list').innerHTML += html
        });
    } catch (error) {
        console.error("获取数据失败:", error);
    }
}
mFetch();
</script>

${Footer(z)}
    `;
}
// 发表帖子
async function post(eid, reload = false) {
    const data = new FormData();
    data.set('land', document.getElementsByName("land").length ? (document.querySelector('input[name="land"]:checked')?.value ?? 0) : 1); // 没有分区选项时添加默认值跳过拦截器
    data.set('content', quill.getSemanticHTML());
    const result = await fetch(new Request('/e/' + eid, { method: 'POST', body: data }))
    if (result.ok) {
        if (reload) {
            window.location.reload()
        } else {
            window.location = document.referrer
        }
    } else {
        let errorMsg = await result.text();
        switch (errorMsg) {
            case 'too_old': errorMsg = '帖子太旧已无法回复'; break;
            case 'too_fast': errorMsg = '太快了🥵请稍后再试'; break;
            case 'not_found': errorMsg = '被回复帖子不存在'; break;
            case 'illegal_land': errorMsg = '请选择合适的分区'; break;
            case 'content_short': errorMsg = '太短了😏请增加内容'; break;
            case 'ad_limit_day': errorMsg = '每天只能回复一次广告'; break;
            case 'ad_limit_week': errorMsg = '每周只能发表一次广告'; break;
        }
        // 创建一个简单的错误提示
        const alert = document.createElement('div');
        alert.style.position = 'fixed';
        alert.style.top = '50%';
        alert.style.left = '50%';
        alert.style.transform = 'translate(-50%, -50%)';
        alert.style.backgroundColor = 'white';
        alert.style.padding = '20px';
        alert.style.borderRadius = '8px';
        alert.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        alert.style.zIndex = '9999';
        alert.style.maxWidth = '400px';
        alert.style.width = '90%';
        alert.style.textAlign = 'center';

        alert.innerHTML = `
            <div style="margin-bottom: 15px; color: #e11d48; font-weight: bold; font-size: 18px;">
                <span>提交失败</span>
            </div>
            <div style="margin-bottom: 20px;">
                ${errorMsg}
            </div>
            <button style="background-color: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                确定
            </button>
        `;

        document.body.appendChild(alert);

        // 添加背景遮罩
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9998';
        document.body.appendChild(overlay);

        // 添加关闭事件
        const closeAlert = () => {
            alert.remove();
            overlay.remove();
        };

        alert.querySelector('button').addEventListener('click', closeAlert);
        overlay.addEventListener('click', closeAlert);

        // 3秒后自动关闭
        setTimeout(closeAlert, 3000);
    }
};

// 删除帖子
async function omit(eid) {
    if (!confirm('真的要删除吗?')) { return; }
    const result = await fetch(new Request('/e/' + eid, { method: 'DELETE' }))
    if (result.ok) {
        location.reload();
    } else {
        const errorMsg = await result.text();
        const toast = document.createElement('div');
        toast.className = 'toast toast-top toast-center';
        toast.style.marginTop = '4rem'; // 添加上边距，避免被导航栏遮挡
        toast.innerHTML = `
            < div class="alert alert-error" >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>删除失败：${errorMsg}</span>
            </div >
            `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// 置顶帖子
async function pin(tid) {
    try {
        const response = await fetch('/t/' + tid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('置顶操作失败');
        }
    } catch (error) {
        console.error('置顶请求出错:', error);
        alert('置顶操作失败');
    }
}

// 标记广告账号
async function adv(uid) {
    try {
        const response = await fetch('/uAdv/' + uid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('标记广告失败');
        }
    } catch (error) {
        console.error('标记广告出错:', error);
        alert('标记广告失败');
    }
}

// 封禁违规账号
async function ban(uid) {
    if (!confirm('封禁会删除所有帖子？')) { return }
    try {
        const response = await fetch('/uBan/' + uid, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            window.location.reload();
        } else {
            alert('封禁账号失败');
        }
    } catch (error) {
        console.error('封禁账号出错:', error);
        alert('封禁账号失败');
    }
}

// 上传文件
function upload() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = function (e) {
        var file = e.target.files[0];
        if (file) {
            var formData = new FormData();
            formData.append('fileToUpload', file);
            formData.append('reqtype', 'fileupload');
            formData.append('userhash', '');
            // 上传 CatBox
            fetch('/f', {
                method: 'POST',
                body: file
            })
                .then(async response => {
                    if (!response.ok) {
                        throw new Error('[' + response.status + '] ' + await response.text());
                    }
                    return await response.text();
                })
                .then(fid => {
                    if (!fid) { return false; }
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', 'https://i0.wp.com/files.catbox.moe/' + fid + '?ssl=1&w=1920');
                    quill.setSelection(range.index + 1);
                })
                .catch(error => {
                    alert('上传失败: ' + error);
                });
        }
    };
}

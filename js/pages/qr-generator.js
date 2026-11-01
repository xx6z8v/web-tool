(function(global){
'use strict';
const App = global.App;

App.registerPage('qr-generator', {
  title: '二维码生成器',

  template: () => `
    <div class="page page-qr">
      <div class="qr-inner">
        <div class="qr-layout">
          <!-- 左侧：设置 -->
          <section class="qr-pane">
            
            <div class="field">
              <div class="field-head">
                <label for="qr-text">内容</label>
                <button class="icon-btn" id="qr-pasteBtn" type="button" title="从剪贴板替换">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="8" y="2" width="8" height="4" rx="1"/>
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  </svg>
                </button>
              </div>
              <textarea id="qr-text" spellcheck="false" placeholder="https://example.com">https://example.com</textarea>
              <div class="counter"><span id="qr-count">0</span> 字符</div>
            </div>

            <div class="field">
              <label>容错级别</label>
              <div class="segmented" id="qr-ecl">
                <button data-ecl="L">L</button>
                <button data-ecl="M" class="active">M</button>
                <button data-ecl="Q">Q</button>
                <button data-ecl="H">H</button>
              </div>
              <div class="tip">级别越高越抗污损，但二维码更密、容量更小</div>
            </div>

            <div class="field">
              <label for="qr-margin">边距（静区）：<span id="qr-margin-val">4</span></label>
              <input type="range" id="qr-margin" min="0" max="8" value="4" />
            </div>

            <div class="colors">
              <div class="color-item">
                <label for="qr-fg">前景色</label>
                <input type="color" id="qr-fg" value="#111827" />
              </div>
              <div class="color-item">
                <label for="qr-bg">背景色</label>
                <input type="color" id="qr-bg" value="#ffffff" />
              </div>
            </div>
          </section>

          <!-- 右侧：预览 -->
          <section class="qr-pane qr-preview-pane">
            <canvas id="qr-canvas"></canvas>
            <p class="qr-hint" id="qr-hint">输入内容后自动生成</p>
            <div class="qr-actions">
              <button class="btn btn-primary" id="qr-dl-png" disabled>下载 PNG</button>
              <button class="btn" id="qr-dl-svg" disabled>SVG</button>
            </div>
          </section>
        </div>
      </div>
    </div>`,

  mount(root, ctx) {
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const input      = $('#qr-text');
    const canvas     = $('#qr-canvas');
    const ctx2d      = canvas.getContext('2d');
    const hint       = $('#qr-hint');
    const countEl    = $('#qr-count');
    const marginEl   = $('#qr-margin');
    const marginVal  = $('#qr-margin-val');
    const fgEl       = $('#qr-fg');
    const bgEl       = $('#qr-bg');
    const dlPng      = $('#qr-dl-png');
    const dlSvg      = $('#qr-dl-svg');
    const pasteBtn   = $('#qr-pasteBtn');

    const HINT_DEFAULT = '输入内容后自动生成';
    let ecl = 'M';
    let currentQR = null;

    /* ---------- 库初始化：确保中文/emoji 走 UTF-8 编码 ---------- */
    if (window.qrcode) {
      window.qrcode.stringToBytes = function (s) {
        return Array.prototype.slice.call(new TextEncoder().encode(s));
      };
    }

    /* ---------- 空状态 ---------- */
    function clearCanvas() {
      canvas.width = canvas.height = 300;
      ctx2d.fillStyle = '#f3f4f6';
      ctx2d.fillRect(0, 0, 300, 300);

      currentQR = null;
      hint.textContent = HINT_DEFAULT;
      hint.style.display = '';
      dlPng.disabled = true;
      dlSvg.disabled = true;
    }

    /* ---------- 渲染到 canvas ---------- */
    function renderCanvas(qr) {
      const count  = qr.getModuleCount();
      const margin = Number(marginEl.value);
      const total  = count + margin * 2;

      // 每个模块的像素大小（保证是整数，边缘才锐利）
      const scale = Math.max(2, Math.floor(640 / total));
      const px    = total * scale;

      canvas.width  = px;
      canvas.height = px;

      ctx2d.fillStyle = bgEl.value;
      ctx2d.fillRect(0, 0, px, px);

      ctx2d.fillStyle = fgEl.value;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx2d.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
          }
        }
      }

      hint.style.display = 'none';
      dlPng.disabled = false;
      dlSvg.disabled = false;
    }

    /* ---------- 主流程 ---------- */
    function update() {
      const text = input.value;
      countEl.textContent = text.length;

      if (!text) { clearCanvas(); return; }

      if (!window.qrcode) {
        clearCanvas();
        hint.textContent = '二维码库加载失败，请检查网络连接';
        return;
      }

      try {
        // typeNumber = 0 → 自动选择最小可用版本（1~40）
        const qr = window.qrcode(0, ecl);
        qr.addData(text);
        qr.make();

        currentQR = qr;
        renderCanvas(qr);
      } catch (err) {
        console.error(err);
        clearCanvas();
        hint.textContent = '内容过长，无法生成二维码';
      }
    }

    /* ---------- 交互事件 ---------- */
    let timer = null;
    ctx.on(input, 'input', () => {
      if (timer) ctx.clearTimeout(timer);
      timer = ctx.setTimeout(update, 100);
    });

    /* ---------- 剪贴板粘贴 ---------- */
    ctx.on(pasteBtn, 'click', () => {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        ctx.toast('当前浏览器不支持读取剪贴板', 'warn');
        return;
      }
      navigator.clipboard.readText().then(text => {
        if (!text) {
          ctx.toast('剪贴板为空', 'warn');
          return;
        }
        input.value = text;
        update(); // 立即刷新二维码
        ctx.toast('已从剪贴板粘贴');
      }).catch(() => {
        ctx.toast('无法读取剪贴板，请手动粘贴', 'err');
      });
    });

    ctx.on($('#qr-ecl'), 'click', (e) => {
      const btn = e.target.closest('button[data-ecl]');
      if (!btn) return;
      ecl = btn.dataset.ecl;
      $$('#qr-ecl button').forEach(b => b.classList.toggle('active', b === btn));
      update();
    });

    ctx.on(marginEl, 'input', () => {
      marginVal.textContent = marginEl.value;
      update();
    });

    ctx.on(fgEl, 'input', update);
    ctx.on(bgEl, 'input', update);

    /* ---------- 下载 PNG ---------- */
    ctx.on(dlPng, 'click', () => {
      if (!currentQR) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrcode.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    });

    /* ---------- 下载 SVG ---------- */
    function buildSVG(qr) {
      const count  = qr.getModuleCount();
      const margin = Number(marginEl.value);
      const total  = count + margin * 2;

      let d = '';
      for (let r = 0; r < count; r++) {
        let c = 0;
        while (c < count) {
          if (qr.isDark(r, c)) {
            let len = 1;
            while (c + len < count && qr.isDark(r, c + len)) len++;
            d += `M${c + margin} ${r + margin}h${len}v1h-${len}z`;
            c += len;
          } else {
            c++;
          }
        }
      }

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"
     viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">
  <rect width="${total}" height="${total}" fill="${bgEl.value}"/>
  <path d="${d}" fill="${fgEl.value}"/>
</svg>`;
    }

    ctx.on(dlSvg, 'click', () => {
      if (!currentQR) return;
      const blob = new Blob([buildSVG(currentQR)], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.svg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    /* ---------- 启动 ---------- */
    update();
  }
});
})(window);
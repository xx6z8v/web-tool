(function(global){
'use strict';
const App = global.App;

App.registerPage('totp', {
  title: '两步验证 TOTP',

  template: () => `
    <div class="page page-totp">
      <div class="page-inner totp-app">
        <div class="field">
          <label for="totp-secret">Base32 密钥</label>
          <div class="input-group">
            <input id="totp-secret" type="text" placeholder="输入密钥，或粘贴 otpauth:// 链接"
                   spellcheck="false" autocomplete="off" autocapitalize="characters">
            <button class="icon-btn" id="totp-pasteBtn" type="button" title="从剪贴板粘贴">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1"/>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="code-panel">
          <div class="code-main">
            <div class="code empty" id="totp-code">· · ·</div>
            <div class="code-hint" id="totp-codeHint">输入密钥后自动生成</div>
          </div>
          <div class="ring-wrap" aria-hidden="true">
            <svg class="ring" viewBox="0 0 80 80">
              <circle class="ring-bg" cx="40" cy="40" r="34"></circle>
              <circle class="ring-fg" id="totp-ringFg" cx="40" cy="40" r="34"></circle>
            </svg>
            <span class="ring-text" id="totp-ringText">30</span>
          </div>
        </div>

        <button class="primary-btn" id="totp-copyBtn" type="button" disabled>复制验证码</button>

        <details class="advanced">
          <summary>高级选项</summary>
          <div class="opt-grid">
            <label class="opt">
              <span>算法</span>
              <select id="totp-alg">
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </label>
            <label class="opt">
              <span>位数</span>
              <select id="totp-digits">
                <option value="6">6 位</option>
                <option value="8">8 位</option>
              </select>
            </label>
            <label class="opt">
              <span>周期</span>
              <select id="totp-period">
                <option value="30">30 秒</option>
                <option value="60">60 秒</option>
              </select>
            </label>
          </div>
        </details>

        <p class="footnote">所有计算均在本地浏览器完成，密钥不会上传</p>
      </div>
    </div>`,

  mount(root, ctx) {
    const $ = sel => root.querySelector(sel);

    const secretInput = $('#totp-secret');
    const pasteBtn    = $('#totp-pasteBtn');
    const codeEl      = $('#totp-code');
    const hintEl      = $('#totp-codeHint');
    const copyBtn     = $('#totp-copyBtn');
    const ringFg      = $('#totp-ringFg');
    const ringText    = $('#totp-ringText');
    const algSel      = $('#totp-alg');
    const digitsSel   = $('#totp-digits');
    const periodSel   = $('#totp-period');

    const RING_C = 2 * Math.PI * 34;
    ringFg.style.strokeDasharray = String(RING_C);

    const state = {
      algorithm: 'SHA-1',
      digits: 6,
      period: 30,
      code: '',
      counter: -1,
      seq: 0,
      lastSecond: -1
    };

    let rafId = null;

    /* ================= Base32 解码 ================= */
    const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    function base32Decode(input) {
      const clean = String(input).toUpperCase().replace(/[=\s]/g, '');
      if (!clean) throw new Error('密钥为空');
      if (/[^A-Z2-7]/.test(clean)) throw new Error('密钥包含非法字符');
      const out = [];
      let value = 0, bits = 0;
      for (let i = 0; i < clean.length; i++) {
        const idx = B32_ALPHABET.indexOf(clean.charAt(i));
        if (idx < 0) throw new Error('无效的 Base32 密钥');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          out.push((value >>> (bits - 8)) & 0xFF);
          bits -= 8;
        }
      }
      if (out.length === 0) throw new Error('密钥长度不足');
      return new Uint8Array(out);
    }

    /* ================= TOTP 计算 ================= */
    function computeTOTP(secret, counter) {
      if (!window.crypto || !window.crypto.subtle) {
        return Promise.reject(new Error('当前环境不支持 Web Crypto'));
      }
      const keyBytes = base32Decode(secret);
      const msg = new Uint8Array(8);
      let c = counter;
      for (let i = 7; i >= 0; i--) {
        msg[i] = c & 0xFF;
        c = Math.floor(c / 256);
      }
      return crypto.subtle
        .importKey('raw', keyBytes, { name: 'HMAC', hash: state.algorithm }, false, ['sign'])
        .then(key => crypto.subtle.sign('HMAC', key, msg))
        .then(buf => {
          const sig = new Uint8Array(buf);
          const off = sig[sig.length - 1] & 0x0F;
          const bin =
            ((sig[off]     & 0x7F) << 24) |
            ((sig[off + 1] & 0xFF) << 16) |
            ((sig[off + 2] & 0xFF) << 8)  |
             (sig[off + 3] & 0xFF);
          const mod = Math.pow(10, state.digits);
          return String(bin % mod).padStart(state.digits, '0');
        });
    }

    /* ================= 渲染 ================= */
    function formatCode(code) {
      if (code.length === 6) return code.slice(0, 3) + ' ' + code.slice(3);
      if (code.length === 8) return code.slice(0, 4) + ' ' + code.slice(4);
      return code;
    }

    function renderCode(code) {
      state.code = code;
      codeEl.textContent = formatCode(code);
      codeEl.classList.remove('empty');
      copyBtn.disabled = false;
      hintEl.textContent = state.algorithm + ' · ' + state.digits + ' 位 · ' + state.period + ' 秒';
    }

    function renderEmpty(msg) {
      state.code = '';
      codeEl.textContent = '· · ·';
      codeEl.classList.add('empty');
      copyBtn.disabled = true;
      hintEl.textContent = msg;
    }

    function refresh(counter) {
      const secret = secretInput.value.trim();
      if (!secret) {
        renderEmpty('输入密钥后自动生成');
        return;
      }
      const seq = ++state.seq;
      computeTOTP(secret, counter).then(code => {
        if (seq !== state.seq) return;
        renderCode(code);
      }).catch(err => {
        if (seq !== state.seq) return;
        renderEmpty(err && err.message ? err.message : '密钥无效');
      });
    }

    function forceRefresh() {
      const counter = Math.floor(Date.now() / 1000 / state.period);
      state.counter = counter;
      state.lastSecond = -1;
      refresh(counter);
    }

    /* ================= 主循环 ================= */
    function frame() {
      if (!App.isActive('totp')) {
        rafId = null;
        return; // 如果切走了，暂停 rAF，等待 activate 重新触发
      }

      const now = Date.now();
      const periodMs = state.period * 1000;
      const counter = Math.floor(now / periodMs);
      const remaining = (counter + 1) * periodMs - now;
      const frac = remaining / periodMs;

      ringFg.style.strokeDashoffset = String(RING_C * (1 - frac));

      const sec = Math.max(1, Math.ceil(remaining / 1000));
      if (sec !== state.lastSecond) {
        state.lastSecond = sec;
        ringText.textContent = sec;
        ringFg.classList.toggle('warn', sec <= 5);
      }

      if (counter !== state.counter) {
        state.counter = counter;
        refresh(counter);
      }

      rafId = ctx.raf(frame);
    }

    // 把重启方法暴露给外部
    ctx.totpStart = () => {
      if (rafId) ctx.cancelRaf(rafId);
      frame();
    };

    /* ================= otpauth:// 解析 ================= */
    function normalizeSecret(raw) {
      return String(raw || '').replace(/[^A-Za-z2-7=]/g, '').toUpperCase();
    }

    function parseOtpAuth(uri) {
      try {
        const u = new URL(uri);
        if (u.protocol !== 'otpauth:') return null;
        const p = u.searchParams;
        const secret = normalizeSecret(p.get('secret'));
        if (!secret) return null;
        let alg = (p.get('algorithm') || 'SHA1').toUpperCase().replace(/-/g, '');
        if (['SHA1', 'SHA256', 'SHA512'].indexOf(alg) < 0) alg = 'SHA1';
        const digits = parseInt(p.get('digits'), 10) === 8 ? 8 : 6;
        const period = parseInt(p.get('period'), 10) === 60 ? 60 : 30;
        return { secret: secret, algorithm: 'SHA-' + alg.slice(3), digits: digits, period: period };
      } catch (e) {
        return null;
      }
    }

    function applyParsed(p) {
      secretInput.value = p.secret;
      state.algorithm = p.algorithm;
      state.digits = p.digits;
      state.period = p.period;
      algSel.value = p.algorithm;
      digitsSel.value = String(p.digits);
      periodSel.value = String(p.period);
      forceRefresh();
      ctx.toast('已导入 otpauth 配置', 'ok');
    }

    /* ================= 输入事件 ================= */
    function handleInput() {
      const raw = secretInput.value.trim();
      if (/^otpauth:\/\//i.test(raw)) {
        const parsed = parseOtpAuth(raw);
        if (parsed) { applyParsed(parsed); }
        else { ctx.toast('无法解析 otpauth 链接', 'err'); }
        return;
      }
      const clean = normalizeSecret(secretInput.value);
      if (secretInput.value !== clean) {
        const pos = secretInput.selectionStart || 0;
        secretInput.value = clean;
        try { secretInput.setSelectionRange(pos, pos); } catch (e) {}
      }
      forceRefresh();
    }

    ctx.on(secretInput, 'input', handleInput);

    ctx.on(pasteBtn, 'click', () => {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        ctx.toast('当前浏览器不支持读取剪贴板', 'warn');
        return;
      }
      navigator.clipboard.readText().then(text => {
        if (!text || !text.trim()) { ctx.toast('剪贴板为空', 'warn'); return; }
        secretInput.value = text.trim();
        handleInput();
        if (secretInput.value) ctx.toast('已粘贴');
      }).catch(() => {
        ctx.toast('无法读取剪贴板，请手动粘贴', 'err');
      });
    });

    ctx.on(copyBtn, 'click', () => {
      if (!state.code) return;
      App.ui.copyText(state.code, copyBtn, '复制验证码');
    });

    ctx.on(algSel, 'change', () => { state.algorithm = algSel.value; forceRefresh(); });
    ctx.on(digitsSel, 'change', () => { state.digits = Number(digitsSel.value); forceRefresh(); });
    ctx.on(periodSel, 'change', () => { state.period = Number(periodSel.value); state.lastSecond = -1; forceRefresh(); });

    renderEmpty('输入密钥后自动生成');
    ctx.totpStart();
  },

  activate(root, ctx) {
    if (ctx.totpStart) ctx.totpStart();
  }
});
})(window);
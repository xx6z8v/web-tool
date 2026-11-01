(function(global){
'use strict';
const App = global.App;

/* =========================================================
   常量（与原页面完全一致）
   ========================================================= */
const DIGITS = '0123456789';
const UPPER  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER  = 'abcdefghijklmnopqrstuvwxyz';
const AMBIGUOUS = new Set('0O1lI|');

const SYMBOLS_ALL          = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
const SYMBOLS_COMMON       = '!@#$%^&*()-_=+';
const SYMBOLS_CONSERVATIVE = '@#$%&*-_.';

const KB3 = (function(){
  const rows = [
    'qwertyuiop','asdfghjkl','zxcvbnm','1234567890',
    'qaz','wsx','edc','rfv','tgb','yhn','ujm','ik,','ol.','p;/'
  ];
  const set = new Set();
  for (const row of rows){
    for (let i = 0; i + 3 <= row.length; i++){
      const s = row.slice(i, i + 3);
      set.add(s);
      set.add([...s].reverse().join(''));
    }
  }
  return set;
})();

/* =========================================================
   纯逻辑
   ========================================================= */
function randomInt(max){
  if (max <= 1) return 0;
  const limit = Math.floor(4294967296 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % max;
}

const isDigit  = c => c >= '0' && c <= '9';
const isLetter = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isSymbol = c => !!c && !isDigit(c) && !isLetter(c);

function violates(prefix, c, rules){
  const n = prefix.length;
  const last  = n >= 1 ? prefix[n - 1] : '';
  const last2 = n >= 2 ? prefix[n - 2] : '';

  if (rules.noRepeat && c === last) return true;
  if (rules.noAdjacentDigits  && last && isDigit(last)  && isDigit(c))  return true;
  if (rules.noAdjacentLetters && last && isLetter(last) && isLetter(c)) return true;
  if (rules.noAdjacentSymbols && last && isSymbol(last) && isSymbol(c)) return true;

  if (rules.noSequences && last && last2){
    const a = last2.charCodeAt(0), b = last.charCodeAt(0), d = c.charCodeAt(0);
    if ((b - a === 1 && d - b === 1) || (a - b === 1 && b - d === 1)) return true;
  }

  if (rules.noKeyboard && last && last2){
    if (KB3.has((last2 + last + c).toLowerCase())) return true;
  }

  if (rules.banned && rules.banned.length){
    const tail = prefix + c;
    for (let i = 0; i < rules.banned.length; i++){
      if (tail.endsWith(rules.banned[i])) return true;
    }
  }
  return false;
}

function getSymbolSet(mode, custom){
  switch (mode){
    case 'tolerant':     return SYMBOLS_ALL;
    case 'common':       return SYMBOLS_COMMON;
    case 'conservative': return SYMBOLS_CONSERVATIVE;
    default:             return custom || '';
  }
}

function buildPools(cfg){
  const raw = [];
  if (cfg.useDigits) raw.push(DIGITS);
  if (cfg.useUpper)  raw.push(UPPER);
  if (cfg.useLower)  raw.push(LOWER);
  if (cfg.useSymbols){
    const s = getSymbolSet(cfg.symbolMode, cfg.customSymbols);
    if (s) raw.push(s);
  }
  return raw
    .map(p => cfg.excludeAmbiguous
      ? [...p].filter(c => !AMBIGUOUS.has(c)).join('')
      : p)
    .filter(p => p.length > 0);
}

function tryBuild(pools, allChars, len, rules, requireEach){
  const seen = new Array(pools.length).fill(false);
  let built = '';

  for (let i = 0; i < len; i++){
    const remaining = len - i;
    let sourceArr = allChars;

    if (requireEach){
      const missingIdx = [];
      for (let j = 0; j < pools.length; j++) if (!seen[j]) missingIdx.push(j);

      if (missingIdx.length > 0){
        const missingChars = [...new Set(missingIdx.map(j => pools[j]).join(''))];
        if (remaining <= missingIdx.length){
          sourceArr = missingChars;
        } else if (Math.random() < (missingIdx.length / remaining) * 2){
          sourceArr = missingChars;
        }
      }
    }

    let cands = sourceArr.filter(c => !violates(built, c, rules));
    if (!cands.length){
      cands = allChars.filter(c => !violates(built, c, rules));
      if (!cands.length) return null;
    }

    const c = cands[randomInt(cands.length)];
    built += c;
    for (let j = 0; j < pools.length; j++){
      if (!seen[j] && pools[j].indexOf(c) !== -1) seen[j] = true;
    }
  }

  if (requireEach && seen.some(v => !v)) return null;
  return built;
}

/* =========================================================
   页面注册
   ========================================================= */
App.registerPage('password', {
  title: '随机密码生成器',

  template: () => `
    <div class="page page-password">
      <div class="page-inner">
        <div id="notice" class="notice"></div>

        <div class="layout">
          <!-- 左栏 -->
          <div class="col-main">
            <section class="card">
              <div id="pwd" class="pwd">—</div>
              <div class="row-actions">
                <button id="btnCopy" class="btn" type="button">📋 复制</button>
                <button id="btnGen" class="btn btn-primary" type="button">🔄 重新生成</button>
              </div>
              <div class="stats">
                <div class="stat"><span>字符池</span><b id="statPool">0</b></div>
                <div class="stat"><span>理论熵</span><b id="statEntropy">0 bit</b></div>
                <div class="stat"><span>强度</span><b id="statStrength">—</b></div>
              </div>
            </section>

            <section class="card">
              <h2>长度</h2>
              <div class="len-wrap">
                <input type="range" id="lenRange" min="6" max="512" value="16">
                <input type="number" id="lenNum" min="6" max="512" value="16">
              </div>
              <div class="quick" id="quickLen">
                <button type="button" data-len="6">6</button>
                <button type="button" data-len="8">8</button>
                <button type="button" data-len="12">12</button>
                <button type="button" data-len="16">16</button>
                <button type="button" data-len="24">24</button>
                <button type="button" data-len="32">32</button>
                <button type="button" data-len="64">64</button>
                <button type="button" data-len="128">128</button>
                <button type="button" data-len="256">256</button>
                <button type="button" data-len="512">512</button>
              </div>
            </section>

            <section class="card">
              <h2>字符种类</h2>
              <div class="chips">
                <label class="chip"><input type="checkbox" id="chkDigits" checked><span>数字 0-9</span></label>
                <label class="chip"><input type="checkbox" id="chkUpper" checked><span>大写 A-Z</span></label>
                <label class="chip"><input type="checkbox" id="chkLower" checked><span>小写 a-z</span></label>
                <label class="chip"><input type="checkbox" id="chkSymbols" checked><span>符号</span></label>
              </div>
              <label class="check" style="margin-top:14px">
                <input type="checkbox" id="excludeAmbiguous">
                <span>排除易混淆字符
                  <span class="tip">去掉 0 O 1 l I |，避免看错</span>
                </span>
              </label>
            </section>
          </div>

          <!-- 右栏 -->
          <div class="col-side">
            <section class="card">
              <h2>符号范围</h2>
              <div class="radio-group">
                <label><input type="radio" name="symMode" value="tolerant">
                  <span>宽容 <span class="hint">全部 32 个 ASCII 符号</span></span></label>
                <label><input type="radio" name="symMode" value="common" checked>
                  <span>常用 <span class="hint">!@#$%^&amp;*()-_=+</span></span></label>
                <label><input type="radio" name="symMode" value="conservative">
                  <span>保守 <span class="hint">@#$%&amp;*-_. （兼容多数金融系统）</span></span></label>
                <label><input type="radio" name="symMode" value="custom">
                  <span>自定义</span></label>
              </div>
              <input type="text" id="customSymbols" value="@#$%&amp;*-_." disabled>
            </section>

            <section class="card">
              <h2>特殊规则</h2>
              <label class="check"><input type="checkbox" id="ruleEach" checked>
                <span>每种已选字符至少出现一次</span></label>
              <label class="check"><input type="checkbox" id="ruleRepeat">
                <span>不能出现连续相同字符<span class="tip">如 aa、11、$$</span></span></label>
              <label class="check"><input type="checkbox" id="ruleAdjDigits">
                <span>不能出现相邻两位数字<span class="tip">如 53、31 —— 部分政府网站规则</span></span></label>
              <label class="check"><input type="checkbox" id="ruleAdjLetters">
                <span>不能出现相邻两位字母<span class="tip">如 ab、Xy</span></span></label>
              <label class="check"><input type="checkbox" id="ruleAdjSymbols">
                <span>不能出现相邻两个符号<span class="tip">如 @#、**</span></span></label>
              <label class="check"><input type="checkbox" id="ruleSeq">
                <span>不能出现递增/递减序列<span class="tip">如 123、abc、321</span></span></label>
              <label class="check"><input type="checkbox" id="ruleKeyboard">
                <span>不能出现键盘连续按键<span class="tip">如 qwe、asd、qaz、123</span></span></label>

              <label class="field-label" for="bannedInput">额外禁止的子串（逗号分隔）</label>
              <input type="text" id="bannedInput" placeholder="例如：admin, 2024, qq">
            </section>
          </div>
        </div>

        <div class="page-footer">
          密码由浏览器 crypto.getRandomValues() 生成，不会上传到任何服务器
        </div>
      </div>
    </div>`,

  mount(root, ctx){
    /* ---------- 引用 ---------- */
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const lenRange = $('#lenRange'), lenNum = $('#lenNum');
    const chkDigits = $('#chkDigits'), chkUpper = $('#chkUpper'),
          chkLower  = $('#chkLower'),  chkSymbols = $('#chkSymbols');
    const excludeAmbiguous = $('#excludeAmbiguous');
    const customSymbols    = $('#customSymbols');
    const ruleEach         = $('#ruleEach');
    const ruleRepeat       = $('#ruleRepeat');
    const ruleAdjDigits    = $('#ruleAdjDigits');
    const ruleAdjLetters   = $('#ruleAdjLetters');
    const ruleAdjSymbols   = $('#ruleAdjSymbols');
    const ruleSeq          = $('#ruleSeq');
    const ruleKeyboard     = $('#ruleKeyboard');
    const bannedInput      = $('#bannedInput');
    const pwdEl  = $('#pwd');
    const noticeEl = $('#notice');
    const btnCopy = $('#btnCopy');
    const btnGen  = $('#btnGen');

    /* ---------- 状态 ---------- */
    let noticeTimer = null;
    let genTimer    = null;
    let copyBtnTimer = null;

    /* ---------- 提示 ---------- */
    function showNotice(msg, type, autoHide){
      if (!msg){
        noticeEl.className = 'notice';
        noticeEl.textContent = '';
        return;
      }
      noticeEl.className = 'notice ' + (type || 'info');
      noticeEl.textContent = msg;
      if (noticeTimer) ctx.clearTimeout(noticeTimer);
      if (autoHide !== false){
        noticeTimer = ctx.setTimeout(() => {
          noticeEl.className = 'notice';
          noticeEl.textContent = '';
          noticeTimer = null;
        }, 3500);
      }
    }

    /* ---------- 配置读取 ---------- */
    function readConfig(){
      return {
        length: Math.min(512, Math.max(6, parseInt(lenNum.value, 10) || 16)),
        useDigits: chkDigits.checked,
        useUpper:  chkUpper.checked,
        useLower:  chkLower.checked,
        useSymbols: chkSymbols.checked,
        symbolMode: $('input[name="symMode"]:checked').value,
        customSymbols: customSymbols.value,
        excludeAmbiguous: excludeAmbiguous.checked,
        requireEach: ruleEach.checked,
        rules: {
          noRepeat: ruleRepeat.checked,
          noAdjacentDigits: ruleAdjDigits.checked,
          noAdjacentLetters: ruleAdjLetters.checked,
          noAdjacentSymbols: ruleAdjSymbols.checked,
          noSequences: ruleSeq.checked,
          noKeyboard: ruleKeyboard.checked,
          banned: bannedInput.value.split(/[,，\s]+/).filter(Boolean)
        }
      };
    }

    /* ---------- 统计 ---------- */
    function updateStats(cfg, pools){
      const allChars = pools.length ? [...new Set(pools.join(''))] : [];
      const poolSize = allChars.length;
      const bits = poolSize > 1 ? cfg.length * Math.log2(poolSize) : 0;

      $('#statPool').textContent = poolSize;
      $('#statEntropy').textContent = bits.toFixed(1) + ' bit';

      const el = $('#statStrength');
      let label, cls;
      if (bits < 40)       { label = '很弱'; cls = 'danger'; }
      else if (bits < 60)  { label = '一般'; cls = 'warn'; }
      else if (bits < 80)  { label = '强';   cls = 'ok'; }
      else if (bits < 120) { label = '很强'; cls = 'ok'; }
      else                 { label = '极强'; cls = 'ok'; }
      el.textContent = label;
      el.className = cls;
    }

    /* ---------- 生成 ---------- */
    function generate(){
      const cfg = readConfig();
      const pools = buildPools(cfg);

      if (!pools.length){
        pwdEl.textContent = '—';
        showNotice('请至少选择一种字符类型', 'err', false);
        updateStats(cfg, []);
        return;
      }

      const allChars = [...new Set(pools.join(''))];
      let pwd = null;

      for (let i = 0; i < 400 && !pwd; i++){
        pwd = tryBuild(pools, allChars, cfg.length, cfg.rules, cfg.requireEach);
      }

      if (!pwd && cfg.requireEach){
        for (let i = 0; i < 200 && !pwd; i++){
          pwd = tryBuild(pools, allChars, cfg.length, cfg.rules, false);
        }
        if (pwd) showNotice('规则过严，已自动忽略「每种字符至少出现一次」', 'info');
      }

      if (!pwd){
        pwdEl.textContent = '—';
        showNotice('在当前的规则组合下无法生成密码，请放宽部分限制（例如关闭某条“相邻字符”规则）', 'err', false);
        updateStats(cfg, pools);
        return;
      }

      // 与原来一致：err 提示清空，info 提示保留
      if (noticeEl.className === 'notice' || noticeEl.className === 'notice info'){
        // 保留
      } else {
        showNotice('');
      }
      pwdEl.textContent = pwd;
      updateStats(cfg, pools);
    }

    function scheduleGen(){
      if (genTimer) ctx.clearTimeout(genTimer);
      genTimer = ctx.setTimeout(generate, 120);
    }

    /* ---------- 复制（三级回退） ---------- */
    const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    function selectPasswordText(){
      try{
        const range = document.createRange();
        range.selectNodeContents(pwdEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }catch(e){}
    }

    async function copyViaClipboardAPI(text){
      if (!navigator.clipboard) return false;
      if (typeof navigator.clipboard.writeText === 'function'){
        try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
      }
      if (typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined'){
        try{
          const item = new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) });
          await navigator.clipboard.write([item]);
          return true;
        }catch(e){}
      }
      return false;
    }

    function copyViaExecCommand(text){
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      ta.style.cssText = [
        'position:fixed','top:0','left:0','width:2em','height:2em',
        'padding:0','border:none','outline:none','box-shadow:none',
        'background:transparent','opacity:0','font-size:16px','z-index:-1'
      ].join(';');
      document.body.appendChild(ta);

      let ok = false;
      try{
        if (isIOS){
          ta.contentEditable = 'true';
          ta.readOnly = false;
          const range = document.createRange();
          range.selectNodeContents(ta);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try{ ta.setSelectionRange(0, text.length); }catch(e){}
        } else {
          ta.focus();
          ta.select();
          try{ ta.setSelectionRange(0, text.length); }catch(e){}
        }
        ok = document.execCommand('copy');
      }catch(e){ ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    let copyBtnTimerRef = null;
    function flashCopyBtn(cls, label){
      if (copyBtnTimerRef) ctx.clearTimeout(copyBtnTimerRef);
      btnCopy.classList.remove('btn-ok', 'btn-warn');
      btnCopy.classList.add(cls);
      btnCopy.textContent = label;
      copyBtnTimerRef = ctx.setTimeout(() => {
        btnCopy.classList.remove('btn-ok', 'btn-warn');
        btnCopy.textContent = '📋 复制';
        copyBtnTimerRef = null;
      }, 1600);
    }

    async function copyPassword(){
      const text = pwdEl.textContent;
      if (!text || text === '—'){
        flashCopyBtn('btn-warn', '⚠️ 暂无密码');
        return;
      }
      if (await copyViaClipboardAPI(text)){
        flashCopyBtn('btn-ok', '✅ 已复制');
        return;
      }
      if (copyViaExecCommand(text)){
        flashCopyBtn('btn-ok', '✅ 已复制');
        return;
      }
      selectPasswordText();
      flashCopyBtn('btn-warn', '⚠️ 请手动复制');
      showNotice('浏览器不支持自动复制，密码已选中，请按 Ctrl+C（Mac：⌘+C）或长按复制', 'info', 5000);
    }

    /* ---------- 事件绑定 ---------- */
    ctx.on(lenRange, 'input', () => { lenNum.value = lenRange.value; scheduleGen(); });
    ctx.on(lenNum, 'input', () => {
      let v = parseInt(lenNum.value, 10);
      if (!isNaN(v)){
        v = Math.min(512, Math.max(6, v));
        lenRange.value = v;
      }
      scheduleGen();
    });
    ctx.on(lenNum, 'blur', () => {
      let v = parseInt(lenNum.value, 10);
      if (isNaN(v)) v = 16;
      v = Math.min(512, Math.max(6, v));
      lenNum.value = v; lenRange.value = v;
      generate();
    });

    ctx.on($('#quickLen'), 'click', e => {
      const btn = e.target.closest('button[data-len]');
      if (!btn) return;
      lenNum.value = btn.dataset.len;
      lenRange.value = btn.dataset.len;
      generate();
    });

    $$('input[name="symMode"]').forEach(r => {
      ctx.on(r, 'change', () => {
        const isCustom = $('input[name="symMode"]:checked').value === 'custom';
        customSymbols.disabled = !isCustom;
        if (isCustom) customSymbols.focus();
        scheduleGen();
      });
    });

    ctx.on(customSymbols, 'input', scheduleGen);

    [chkDigits, chkUpper, chkLower, chkSymbols, excludeAmbiguous,
     ruleEach, ruleRepeat, ruleAdjDigits, ruleAdjLetters, ruleAdjSymbols,
     ruleSeq, ruleKeyboard].forEach(el => {
      ctx.on(el, 'change', scheduleGen);
    });

    ctx.on(bannedInput, 'input', scheduleGen);

    ctx.on(btnGen, 'click', generate);
    ctx.on(btnCopy, 'click', copyPassword);

    /* ---------- 首次生成 ---------- */
    generate();
  },
});
})(window);
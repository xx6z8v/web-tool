(function(global){
'use strict';
const App = global.App;

/* =========================================================
   数据来自独立数据文件 data/md-cheatsheet-data.js
   ========================================================= */
const SVG_IMG = window.MDCheatsheetData.SVG_IMG;
const DATA    = window.MDCheatsheetData.DATA;

/* =========================================================
   页面私有常量
   ========================================================= */
const CATS = ['全部', '基础', '标准', '扩展'];
const CAT_CLASS = { '基础': 'basic', '标准': 'std', '扩展': 'ext' };

/* =========================================================
   页面注册
   ========================================================= */
App.registerPage('markdown-cheatsheet', {
  title: 'Markdown 语法速查',

  template: () => `
    <div class="page page-md-cheatsheet">
      <div class="page-inner">
        <div class="mc-header">
          <div class="mc-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input id="mc-search" type="text" placeholder="搜索：表格 / 脚注 / 代码块 / 数学公式 …" autocomplete="off" spellcheck="false">
            <button class="mc-clear-btn" id="mc-clear" title="清空">✕</button>
          </div>
        </div>

        <div class="mc-cats" id="mc-cats"></div>

        <div class="mc-legend">
          <span><i class="d1"></i><b>基础</b>：各家 Markdown 实现一定支持</span>
          <span><i class="d2"></i><b>标准</b>：CommonMark 规范定义的语法</span>
          <span><i class="d3"></i><b>扩展</b>：部分平台额外支持，用前先确认</span>
        </div>

        <div class="mc-meta" id="mc-meta"></div>
        <div class="mc-list" id="mc-list"></div>
      </div>
    </div>`,

  mount(root, ctx){
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const state = { q:'', cat:'全部' };
    const listEl = $('#mc-list');
    const metaEl = $('#mc-meta');
    const inputEl = $('#mc-search');
    const clearEl = $('#mc-clear');

    /* ---------- 工具 ---------- */
    function esc(s){ return String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
    function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function hl(text, words){
      const safe = esc(text);
      if(!words.length) return safe;
      const re = new RegExp('(' + words.map(escRe).join('|') + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    }

    /* ---------- 分类渲染 ---------- */
    const catsEl = $('#mc-cats');
    catsEl.innerHTML = CATS.map(c => `<button data-cat="${esc(c)}"${c === '全部' ? ' class="active"' : ''}>${esc(c)}</button>`).join('');
    ctx.on(catsEl, 'click', e => {
      const btn = e.target.closest('button[data-cat]');
      if(!btn) return;
      state.cat = btn.dataset.cat;
      [...catsEl.children].forEach(b => b.classList.toggle('active', b === btn));
      render();
    });

    /* ---------- 搜索事件 ---------- */
    ctx.on(inputEl, 'input', () => {
      state.q = inputEl.value;
      clearEl.classList.toggle('show', state.q.length > 0);
      render();
    });
    ctx.on(clearEl, 'click', () => {
      inputEl.value = ''; state.q = ''; clearEl.classList.remove('show'); inputEl.focus(); render();
    });

    /* ---------- 快捷键 ---------- */
    ctx.onActive(window, 'keydown', e => {
      if(e.key === '/' && document.activeElement !== inputEl){ e.preventDefault(); inputEl.focus(); inputEl.select(); }
      else if(e.key === 'Escape'){ inputEl.value = ''; state.q = ''; clearEl.classList.remove('show'); render(); }
    });

    /* ---------- 卡片模板 ---------- */
    function cardHTML(d, words) {
      const cls = CAT_CLASS[d.c] || 'std';
      return `<article class="mc-card">
        <div class="mc-card-head">
          <h3>${hl(d.t, words)}</h3>
          <span class="mc-badge ${cls}">${esc(d.c)}</span>
        </div>
        <p>${hl(d.d, words)}</p>
        <div class="mc-codewrap">
          <pre><code>${esc(d.code)}</code></pre>
          <button class="mc-copy">复制</button>
        </div>
        ${d.render ? `<div class="mc-preview">${d.render}</div>` : ''}
        <div class="mc-tags">${d.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
        ${App.ui.getExtLinks(d.t, '(Markdown 语法)')}
      </article>`;
    }

    /* ---------- 渲染 ---------- */
    function render() {
      const qRaw = state.q.trim();
      const words = qRaw.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = hay => !words.length || words.every(w => hay.toLowerCase().includes(w));

      const items = DATA.filter(d => {
        if(state.cat !== '全部' && d.c !== state.cat) return false;
        return hit(d.t + ' ' + d.d + ' ' + d.code + ' ' + d.c + ' ' + d.tags.join(' '));
      });

      let metaText = `共 ${items.length} 条`;
      if(state.cat !== '全部') metaText += ` · ${state.cat}`;
      metaEl.innerHTML = `<span>${esc(metaText)}</span>` +
        (qRaw ? App.ui.getExtLinks(qRaw, '(Markdown 语法)') : '');

      if(!items.length) {
        listEl.innerHTML = `<div class="mc-empty"><strong>没有找到「${esc(qRaw)}」</strong><span>换个关键词试试，或直接跳转搜索引擎查阅</span>${App.ui.getExtLinks(qRaw, '(Markdown 语法)')}</div>`;
        return;
      }
      listEl.innerHTML = items.map(d => cardHTML(d, words)).join('');
    }

    /* ---------- 复制 ---------- */
    ctx.on(listEl, 'click', e => {
      const btn = e.target.closest('.mc-copy');
      if(!btn) return;
      const code = btn.parentElement.querySelector('code').textContent;
      App.ui.copyText(code, btn);
    });

    render();
  }
});
})(window);
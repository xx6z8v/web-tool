(function(global){
'use strict';
const App = global.App;

/* =========================================================
   数据来自独立数据文件 data/c-cheatsheet-data.js
   ========================================================= */
const DATA = window.CCheatsheetData.DATA;
const ADV  = window.CCheatsheetData.ADV;

/* =========================================================
   页面注册
   ========================================================= */
App.registerPage('c-cheatsheet', {
  title: 'C 语言语法速查',

  template: () => `
    <div class="page page-cheatsheet">
      <div class="cs-shell">
        <div class="cs-search-row">
          <div class="cs-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input id="cs-search" type="text"
                   placeholder="搜索：指针 / 位域 / 线程 / printf …"
                   autocomplete="off" spellcheck="false">
            <button class="cs-clear" id="cs-clear" type="button" title="清空">✕</button>
          </div>
        </div>
        <div class="cs-cats" id="cs-cats"></div>
        <div class="cs-meta" id="cs-meta"></div>
        <div class="cs-list" id="cs-list"></div>
      </div>
    </div>`,

  mount(root, ctx){
    const $  = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const state = { q:'', cat:'全部' };

    /* ---------- 工具 ---------- */
    function esc(s){
      return String(s).replace(/[&<>"]/g, ch => (
        { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]
      ));
    }
    function escRe(s){
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    function hl(text, words){
      const safe = esc(text);
      if(!words.length) return safe;
      const re = new RegExp('(' + words.map(escRe).join('|') + ')', 'gi');
      return safe.replace(re, '<mark>$1</mark>');
    }

    /* ---------- 分类 ---------- */
    const CATS = ['全部', ...new Set([...DATA.map(d => d.c), ...ADV.map(d => d.c)])];
    const catsEl = $('#cs-cats');

    catsEl.innerHTML = CATS.map(c =>
      '<button type="button" data-cat="' + esc(c) + '"' +
      (c === '全部' ? ' class="active"' : '') + '>' + esc(c) + '</button>'
    ).join('');

    ctx.on(catsEl, 'click', e => {
      const btn = e.target.closest('button[data-cat]');
      if(!btn) return;
      state.cat = btn.dataset.cat;
      [...catsEl.children].forEach(b => b.classList.toggle('active', b === btn));
      render();
    });

    /* ---------- 搜索框 ---------- */
    const inputEl = $('#cs-search');
    const clearEl = $('#cs-clear');
    const listEl  = $('#cs-list');
    const metaEl  = $('#cs-meta');

    ctx.on(inputEl, 'input', () => {
      state.q = inputEl.value;
      clearEl.classList.toggle('show', state.q.length > 0);
      render();
    });

    ctx.on(clearEl, 'click', () => {
      inputEl.value = '';
      state.q = '';
      clearEl.classList.remove('show');
      inputEl.focus();
      render();
    });

    /* ---------- 快捷键（仅激活时生效） ---------- */
    ctx.onActive(window, 'keydown', e => {
      if(e.key === '/' && document.activeElement !== inputEl){
        e.preventDefault();
        inputEl.focus();
        inputEl.select();
      } else if(e.key === 'Escape'){
        inputEl.value = '';
        state.q = '';
        clearEl.classList.remove('show');
        render();
      }
    });

    /* ---------- 卡片模板 ---------- */
    function localCardHTML(d, words){
      return '<article class="cs-card">' +
        '<div class="cs-card-head">' +
          '<h3>' + hl(d.t, words) + '</h3>' +
          '<span class="cs-badge">' + esc(d.c) + '</span>' +
        '</div>' +
        '<p>' + hl(d.d, words) + '</p>' +
        '<div class="cs-codewrap">' +
          '<pre><code>' + esc(d.code) + '</code></pre>' +
          '<button class="cs-copy" type="button">复制</button>' +
        '</div>' +
        '<div class="cs-tags">' +
          d.tags.map(t => '<span>' + esc(t) + '</span>').join('') +
        '</div>' +
        App.ui.getExtLinks(d.t, '(C语言 OR C教程)') +
      '</article>';
    }

    function advCardHTML(d, words){
      const kstr = (d.k || '').split(/\s+/).filter(Boolean).join(' · ');
      return '<article class="cs-card adv">' +
        '<div class="cs-card-head">' +
          '<h3>' + hl(d.t, words) + '</h3>' +
          '<span class="cs-badge ext-badge">外部搜索</span>' +
        '</div>' +
        '<p>' + (kstr ? hl('相关：' + kstr, words)
                      : '本知识库未收录详细说明，可跳转搜索引擎查阅。') + '</p>' +
        App.ui.getExtLinks(d.t, '(C语言 OR C教程)') +
      '</article>';
    }

    /* ---------- 渲染 ---------- */
    function render(){
      const qRaw = state.q.trim();
      const words = qRaw.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = hay => !words.length ||
        words.every(w => hay.toLowerCase().includes(w));

      const locals = DATA.filter(d => {
        if(state.cat !== '全部' && d.c !== state.cat) return false;
        return hit(d.t + ' ' + d.d + ' ' + d.code + ' ' + d.c + ' ' + d.tags.join(' '));
      });

      const showAdv = words.length > 0 || state.cat !== '全部';
      let advs = [];
      if(showAdv){
        advs = ADV.filter(d => {
          if(state.cat !== '全部' && d.c !== state.cat) return false;
          return hit(d.t + ' ' + (d.k || '') + ' ' + d.c);
        });
        advs.sort((a, b) => {
          const at = words.some(w => a.t.toLowerCase().includes(w)) ? 0 : 1;
          const bt = words.some(w => b.t.toLowerCase().includes(w)) ? 0 : 1;
          return at - bt;
        });
      }

      if(!locals.length && !advs.length){
        metaEl.innerHTML = qRaw ? App.ui.getExtLinks(qRaw, '(C语言 OR C教程)') : '';
        listEl.innerHTML = '<div class="cs-empty">' +
          '<strong>' + (qRaw
            ? '知识库中没有「' + esc(qRaw) + '」'
            : '该分类下暂无本地条目') + '</strong>' +
          '<span>本知识库未收录该主题，可直接跳转搜索引擎查阅</span>' +
          App.ui.getExtLinks(qRaw, '(C语言 OR C教程)') +
        '</div>';
        return;
      }

      let metaText = '本地条目 ' + locals.length + ' 条';
      if(advs.length) metaText += ' · 外部跳转 ' + advs.length + ' 条';
      if(state.cat !== '全部') metaText += ' · ' + state.cat;
      if(!words.length && state.cat === '全部') metaText += ' · 高级语法在搜索时自动匹配';

      metaEl.innerHTML = '<span>' + esc(metaText) + '</span>' +
        (qRaw ? App.ui.getExtLinks(qRaw, '(C语言 OR C教程)') : '');

      let html = locals.map(d => localCardHTML(d, words)).join('');
      if(advs.length){
        html += '<div class="adv-note">以下主题未在知识库中展开，跳转外部搜索</div>';
        html += advs.map(d => advCardHTML(d, words)).join('');
      }
      listEl.innerHTML = html;
    }

    /* ---------- 复制代码 ---------- */
    ctx.on(listEl, 'click', e => {
      const btn = e.target.closest('.cs-copy');
      if(!btn) return;
      const code = btn.parentElement.querySelector('code').textContent;
      App.ui.copyText(code, btn);
    });

    /* ---------- 首次渲染 ---------- */
    render();
  },
});
})(window);
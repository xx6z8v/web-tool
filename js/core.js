(function(global){
'use strict';

const App = {
  _pages:{},
  _mounted:{},
  _current:null,

  registerPage(id, def){
    this._pages[id] = def;
  },

  isActive(id){ return this._current === id; },

  _mountPage(id){
    if(this._mounted[id]) return this._mounted[id];
    const def = this._pages[id];
    if(!def) return null;

    const wrap = document.createElement('section');
    wrap.className = 'view';
    wrap.dataset.page = id;
    wrap.innerHTML = typeof def.template === 'function' ? def.template() : (def.template || '');
    document.getElementById('views').appendChild(wrap);

    const ctx = createContext(id, wrap);
    let cleanup = null;
    try{
      cleanup = def.mount ? def.mount(wrap, ctx) : null;
    }catch(e){
      console.error('[mount:' + id + ']', e);
    }
    if(typeof cleanup === 'function') ctx.onCleanup(cleanup);

    this._mounted[id] = { wrap, ctx, def };
    return this._mounted[id];
  },

  _activate(id){
    const rec = this._mounted[id] || this._mountPage(id);
    if(!rec) return;

    if(this._current && this._mounted[this._current] && this._mounted[this._current].def.deactivate){
      try{ this._mounted[this._current].def.deactivate(this._mounted[this._current].wrap, this._mounted[this._current].ctx); }
      catch(e){ console.error(e); }
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.id === id);
    });

    rec.wrap.classList.add('active');
    this._current = id;

    if(rec.def.title) document.title = rec.def.title + ' · 工具箱';

    // 顶栏标题：优先 fullTitle（emoji + 文字），否则用 title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      titleEl.textContent = rec.def.fullTitle || rec.def.title || '';
    }

    if(rec.def.activate){
      try{ rec.def.activate(rec.wrap, rec.ctx); }
      catch(e){ console.error(e); }
    }

    try{ localStorage.setItem('toolbox:last', id); }catch(_){}
  },

    /* ---- 主题 ---- */
  setTheme(t, persist = true){
    document.documentElement.dataset.theme = t;
    const btn = document.getElementById('themeBtn');
    // 图标依然保持“提示下一步”的逻辑：白天显示月亮，黑夜显示太阳
    if(btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
    
    if (persist) {
      try{ localStorage.setItem('toolbox:theme', t); }catch(_){}
    }

    try {
      window.dispatchEvent(new CustomEvent('toolbox:themechange', { detail: { theme: t } }));
    } catch(e) { console.warn(e); }
  },

  toggleTheme(){
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(cur, true); // 手动点击时，强制持久化
  },

  /* ---- 全局 toast ---- */
  toast(msg, type){
    let el = document.getElementById('appToast');
    if(!el){
      el = document.createElement('div');
      el.id = 'appToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.className = 'toast show' + (type ? ' toast-' + type : '');
    el.textContent = msg;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2600);
  },

  /* ---- 通用 UI 组件 ---- */
  ui: {
    // 通用的复制文本逻辑
    async copyText(text, btnEl, defaultText = '复制') {
      let ok = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(text); ok = true; } catch(_){}
      }
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); ok = true; } catch(_){}
        document.body.removeChild(ta);
      }

      if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = ok ? '已复制 ✓' : '复制失败';
        btnEl.classList.toggle('done', ok);
        setTimeout(() => {
          btnEl.textContent = defaultText;
          btnEl.classList.remove('done');
        }, 1300);
      } else {
        App.toast(ok ? '已复制' : '复制失败', ok ? 'ok' : 'err');
      }
      return ok;
    },

    // 生成外部搜索按钮 HTML
    getExtLinks(keyword, suffix) {
      const q = encodeURIComponent(keyword ? `${keyword} ${suffix}` : suffix);
      const icon = '<svg viewBox="0 0 24 24"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';
      return `<div class="ext-actions">
        <span class="ext-label">外部搜索</span>
        <a class="ext-btn" href="https://www.bing.com/search?q=${q}" target="_blank" rel="noopener noreferrer">${icon} Bing</a>
        <a class="ext-btn" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener noreferrer">${icon} Google</a>
      </div>`;
    }
  },

  /* ---- DOM 快捷方式 ---- */
  $(sel, root){ return (root || document).querySelector(sel); },
  $$(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
};

function createContext(id, root){
  const listeners = [];
  const cleanups  = [];
  const timers    = new Set();
  const rafs      = new Set();

  const ctx = {
    id,
    root,
    $:  sel => root.querySelector(sel),
    $$: sel => Array.from(root.querySelectorAll(sel)),

    on(target, type, handler, opts){
      target.addEventListener(type, handler, opts);
      const entry = { target, type, handler, opts };
      listeners.push(entry);
      return () => {
        target.removeEventListener(type, handler, opts);
        const i = listeners.indexOf(entry);
        if(i >= 0) listeners.splice(i, 1);
      };
    },

    onActive(target, type, handler, opts){
      let bound = false;
      const bind   = () => { if(!bound){ target.addEventListener(type, handler, opts); bound = true; } };
      const unbind = () => { if(bound){ target.removeEventListener(type, handler, opts); bound = false; } };
      if(App.isActive(id)) bind();
      cleanups.push(unbind);
      (ctx._activeHooks || (ctx._activeHooks = [])).push({ bind, unbind });
      return unbind;
    },

    onCleanup(fn){ cleanups.push(fn); return fn; },

    setTimeout(fn, ms){
      const tid = setTimeout(() => { timers.delete(tid); fn(); }, ms);
      timers.add(tid);
      return tid;
    },
    clearTimeout(tid){ timers.delete(tid); clearTimeout(tid); },
    setInterval(fn, ms){
      const tid = setInterval(fn, ms);
      timers.add(tid);
      return tid;
    },
    raf(fn){
      const rid = requestAnimationFrame(t => { rafs.delete(rid); fn(t); });
      rafs.add(rid);
      return rid;
    },
    cancelRaf(rid){ rafs.delete(rid); cancelAnimationFrame(rid); },

    toast(msg, type){ App.toast(msg, type); },
    isActive(){ return App.isActive(id); },

    _onActivate(){
      (ctx._activeHooks || []).forEach(h => h.bind());
    },
    _onDeactivate(){
      (ctx._activeHooks || []).forEach(h => h.unbind());
    },

    _destroy(){
      listeners.forEach(e => e.target.removeEventListener(e.type, e.handler, e.opts));
      cleanups.forEach(fn => { try{ fn(); }catch(e){ console.error(e); } });
      timers.forEach(tid => { clearTimeout(tid); clearInterval(tid); });
      rafs.forEach(rid => cancelAnimationFrame(rid));
      listeners.length = 0;
      cleanups.length  = 0;
      timers.clear();
      rafs.clear();
    }
  };
  return ctx;
}

const _origActivate = App._activate.bind(App);
App._activate = function(id){
  if(this._current && this._mounted[this._current]){
    const prev = this._mounted[this._current];
    try{ prev.ctx._onDeactivate(); }catch(e){ console.error(e); }
  }
  _origActivate(id);
  const rec = this._mounted[id];
  if(rec){ try{ rec.ctx._onActivate(); }catch(e){ console.error(e); } }
};

global.App = App;
})(window);
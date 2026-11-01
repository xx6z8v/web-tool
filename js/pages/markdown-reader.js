(function(global){
'use strict';
const App = global.App;

// ---- 1. 正则高亮引擎 ----
const LANGS = {
  js: { comment: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, string: String.raw`\x60(?:\\[\s\S]|[^\\\x60])*\x60|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'`, number: String.raw`\b(?:0[xXbBoO][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`, keyword: String.raw`\b(?:async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield|true|false|null|NaN)\b` },
  py: { comment: String.raw`#[^\n]*`, string: String.raw`"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'`, number: String.raw`\b(?:0[xXbBoO][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b`, keyword: String.raw`\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|False|try|while|with|yield|self|print)\b` },
  html: { comment: String.raw`<!--[\s\S]*?-->`, string: String.raw`"[^"]*"|'[^']*'`, number: String.raw`\b\d+(?:\.\d+)?\b`, keyword: String.raw`<\/?[a-zA-Z][\w:-]*|\/?>` },
  css: { comment: String.raw`\/\*[\s\S]*?\*\/`, string: String.raw`"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'`, number: String.raw`#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg|fr|pt)?\b`, keyword: String.raw`@[\w-]+|!important` },
  json:{ comment: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, string: String.raw`"(?:\\[\s\S]|[^\\"])*"`, number: String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`, keyword: String.raw`\b(?:true|false|null)\b` },
  bash:{ comment: String.raw`#[^\n]*`, string: String.raw`"(?:\\[\s\S]|[^\\"])*"|'[^']*'`, number: String.raw`\b\d+\b`, keyword: String.raw`\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|echo|cd|source|alias|sudo|apt|npm|npx|git|node|python|pip)\b` },
  c:   { comment: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`, string: String.raw`"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'`, number: String.raw`\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?[fFlLuU]*)\b`, keyword: String.raw`\b(?:auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|class|public|private|protected|virtual|namespace|using|template|try|catch|throw|new|delete|this|true|false|nullptr|boolean|package|import|extends|implements|interface|final|abstract|func|var|range|defer|go|chan|map|type|fn|let|mut|pub|impl|trait|match|use|mod|where|unsafe|loop|String|System|println|fmt)\b` }
};
const LANG_ALIAS = { javascript:'js',jsx:'js',mjs:'js',cjs:'js',typescript:'js',ts:'js',tsx:'js',node:'js', python:'py',py3:'py',gyp:'py', htm:'html',xml:'html',svg:'html',vue:'html',xhtml:'html', scss:'css',sass:'css',less:'css', jsonc:'json',json5:'json', sh:'bash',shell:'bash',zsh:'bash',console:'bash',terminal:'bash', cpp:'c','c++':'c',cc:'c',h:'c',hpp:'c',csharp:'c',cs:'c',java:'c', go:'c',golang:'c',rust:'c',rs:'c',kotlin:'c',kt:'c',swift:'c',scala:'c' };

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(code, lang){
  if(!code) return '';
  if(code.length > 30000) return escapeHtml(code);
  const key = LANG_ALIAS[String(lang).toLowerCase()] || String(lang).toLowerCase();
  const cfg = LANGS[key];
  if(!cfg) return escapeHtml(code);
  const re = new RegExp('(' + cfg.comment + ')|(' + cfg.string + ')|(' + cfg.number + ')|(' + cfg.keyword + ')', 'g');
  let out = '', last = 0, m;
  while((m = re.exec(code)) !== null){
    if(m[0] === ''){ re.lastIndex++; continue; }
    if(m.index > last) out += escapeHtml(code.slice(last, m.index));
    const cls = m[1] ? 'cmt' : m[2] ? 'str' : m[3] ? 'num' : 'kw';
    out += '<span class="tk-' + cls + '">' + escapeHtml(m[0]) + '</span>';
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

// ---- 2. Markdown 解析器 ----
const LIST_RE = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)([\s\S]*)$/;
let headings = [], hidCounter = 0;

function safeUrl(u, allowDataImg){
  const s = String(u).trim();
  if(/^(javascript|vbscript):/i.test(s)) return null;
  if(/^data:/i.test(s) && !(allowDataImg && /^data:image\//i.test(s))) return null;
  return s;
}

function inline(text){
  const stash = [];
  const put = html => { stash.push(html); return '\u0000' + (stash.length - 1) + '\u0000'; };
  text = text.replace(/(`+)([\s\S]*?)\1/g, (m, ticks, code) => put('<code>' + escapeHtml(code.replace(/^ (.*) $/, '$1')) + '</code>'));
  text = text.replace(/ {2,}\n/g, '\u0002').replace(/\\\n/g, '\u0002');
  text = escapeHtml(text);
  text = text.replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, (m, c) => put(escapeHtml(c)));
  text = text.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^)]*)&quot;)?\s*\)/g, (m, alt, src, title) => {
    const u = safeUrl(src, true);
    if(!u) return m;
    return put('<img src="' + u + '" alt="' + alt + '"' + (title ? ' title="' + title + '"' : '') + ' loading="lazy">');
  });
  text = text.replace(/\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^)]*)&quot;)?\s*\)/g, (m, txt, url, title) => {
    const u = safeUrl(url, false);
    if(!u) return m;
    return put('<a href="' + u + '" target="_blank" rel="noopener noreferrer"' + (title ? ' title="' + title + '"' : '') + '>' + txt + '</a>');
  });
  text = text.replace(/\*\*\*([^\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^\n]+?)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^\w*])\*([^\n*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^\w_])_([^\n_]+?)_(?!_)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^\n]+?)~~/g, '<del>$1</del>');
  text = text.replace(/\n/g, ' ').replace(/\u0002/g, '<br>');
  for(let k = 0; k < 12; k++){
    const before = text;
    text = text.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[+i] !== undefined ? stash[+i] : m);
    if(text === before) break;
  }
  return text;
}

function isBlockStart(line){
  return /^ {0,3}#{1,6}[ \t]/.test(line) || /^ {0,3}(`{3,}|~{3,})/.test(line) || /^ {0,3}>/.test(line) || /^ {0,3}(?:\*[ \t]*){3,}$/.test(line) || /^ {0,3}(?:-[ \t]*){3,}$/.test(line) || /^ {0,3}(?:_[ \t]*){3,}$/.test(line) || LIST_RE.test(line);
}
function isTableSep(line){
  if(!line || !line.includes('-')) return false;
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = t.split('|');
  return cells.length > 0 && cells.every(c => /^\s*:?-+:?\s*$/.test(c));
}
function splitRow(line){
  let s = line.trim();
  if(s.startsWith('|')) s = s.slice(1);
  if(s.endsWith('|')) s = s.slice(0, -1);
  const cells = []; let cur = '';
  for(let k = 0; k < s.length; k++){
    if(s[k] === '\\' && s[k+1] === '|'){ cur += '|'; k++; continue; }
    if(s[k] === '|'){ cells.push(cur); cur = ''; continue; }
    cur += s[k];
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}
function parseList(lines, start){
  const first = lines[start].match(LIST_RE);
  const baseIndent = first[1].length;
  const ordered = /^\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items = []; let i = start;
  while(i < lines.length){
    if(!lines[i].trim()){
      let j = i; while(j < lines.length && !lines[j].trim()) j++;
      if(j >= lines.length){ i = j; break; }
      const nm = lines[j].match(LIST_RE);
      if(nm && nm[1].length >= baseIndent){ i = j; continue; }
      break;
    }
    const m = lines[i].match(LIST_RE);
    if(!m || m[1].length !== baseIndent) break;
    const prefixLen = m[1].length + m[2].length + m[3].length;
    const itemLines = [m[4]]; i++;
    while(i < lines.length){
      const l = lines[i];
      if(!l.trim()){ itemLines.push(''); i++; continue; }
      const indent = l.match(/^[ \t]*/)[0].length;
      if(indent <= baseIndent) break;
      itemLines.push(l.slice(Math.min(indent, prefixLen)));
      i++;
    }
    while(itemLines.length > 1 && !itemLines[itemLines.length - 1].trim()) itemLines.pop();
    items.push(itemLines);
  }
  let html = ordered ? '<ol' + (startNum !== 1 ? ' start="' + startNum + '"' : '') + '>' : '<ul>';
  for(const item of items){
    const body = item.slice();
    let task = null;
    const tm = body[0].match(/^\[([ xX])\][ \t]+/);
    if(tm){ task = tm[1].toLowerCase() === 'x'; body[0] = body[0].slice(tm[0].length); }
    let inner = renderBlocks(body);
    inner = inner.replace(/^<p>([\s\S]*?)<\/p>$/, '$1');
    if(task !== null) html += '<li class="task-item"><input type="checkbox" disabled' + (task ? ' checked' : '') + '> ' + inner + '</li>';
    else html += '<li>' + inner + '</li>';
  }
  html += ordered ? '</ol>' : '</ul>';
  return { html, next: i };
}

function renderBlocks(lines){
  const out = []; let i = 0; const n = lines.length;
  while(i < n){
    const line = lines[i];
    if(!line.trim()){ i++; continue; }
    let m = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)[ \t]*$/.exec(line);
    if(m){
      const marker = m[1], lang = m[2] || '';
      const buf = []; i++;
      while(i < n){
        const cm = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(lines[i]);
        if(cm && cm[1][0] === marker[0] && cm[1].length >= marker.length){ i++; break; }
        buf.push(lines[i]); i++;
      }
      out.push('<div class="code-wrap"><div class="code-head"><span class="code-lang">' + escapeHtml(lang || 'text') + '</span><button class="copy-btn" type="button">复制</button></div><pre><code>' + highlight(buf.join('\n'), lang) + '</code></pre></div>');
      continue;
    }
    m = /^ {0,3}(#{1,6})[ \t]+([\s\S]*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if(m){
      const lv = m[1].length, txt = m[2], id = 'h' + (hidCounter++);
      headings.push({ level: lv, text: txt, id });
      out.push('<h' + lv + ' id="' + id + '">' + inline(txt) + '</h' + lv + '>');
      i++; continue;
    }
    if(/^ {0,3}(?:\*[ \t]*){3,}$/.test(line) || /^ {0,3}(?:-[ \t]*){3,}$/.test(line) || /^ {0,3}(?:_[ \t]*){3,}$/.test(line)){
      out.push('<hr>'); i++; continue;
    }
    if(/^ {0,3}>/.test(line)){
      const buf = [];
      while(i < n && /^ {0,3}>/.test(lines[i])){ buf.push(lines[i].replace(/^ {0,3}> ?/, '')); i++; }
      out.push('<blockquote>' + renderBlocks(buf) + '</blockquote>');
      continue;
    }
    if(line.includes('|') && i + 1 < n && isTableSep(lines[i + 1])){
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(c => { const l = c.startsWith(':'), r = c.endsWith(':'); return l && r ? 'center' : r ? 'right' : l ? 'left' : ''; });
      i += 2;
      const rows = [];
      while(i < n && lines[i].includes('|') && lines[i].trim() !== '' && !isBlockStart(lines[i])){ rows.push(splitRow(lines[i])); i++; }
      let t = '<div class="table-wrap"><table><thead><tr>';
      header.forEach((c, k) => { t += '<th' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(c) + '</th>'; });
      t += '</tr></thead><tbody>';
      rows.forEach(r => {
        t += '<tr>';
        for(let k = 0; k < header.length; k++) t += '<td' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(r[k] !== undefined ? r[k] : '') + '</td>';
        t += '</tr>';
      });
      t += '</tbody></table></div>';
      out.push(t); continue;
    }
    if(LIST_RE.test(line)){
      const r = parseList(lines, i); out.push(r.html); i = r.next; continue;
    }
    const buf = [line]; i++;
    while(i < n && lines[i].trim() !== '' && !isBlockStart(lines[i])){ buf.push(lines[i]); i++; }
    out.push('<p>' + inline(buf.join('\n')) + '</p>');
  }
  return out.join('\n');
}

function mdToHtml(src){
  headings = []; hidCounter = 0;
  const lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return renderBlocks(lines);
}

// ---- 3. 页面注册 ----
App.registerPage('markdown-reader', {
  title: 'Markdown 阅读器',

  template: () => `
    <div class="page page-markdown">
      <div class="md-toolbar">
        <button class="icon-btn" id="md-sidebar-btn" title="切换侧栏">☰</button>
        <div class="md-doc-title" id="md-doc-title">Markdown 阅读器</div>
        <button class="icon-btn" id="md-search-btn" title="搜索 (Ctrl+F)">🔍</button>
        <button class="icon-btn" id="md-font-down">A−</button>
        <button class="icon-btn" id="md-font-reset">16</button>
        <button class="icon-btn" id="md-font-up">A+</button>
        <button class="btn btn-primary" id="md-open-btn" style="margin-left:8px;">打开文件</button>
        <input type="file" id="md-file-input" multiple hidden accept=".md,.markdown,.mdown,.mkd,.mdx,.txt,text/markdown,text/plain">
      </div>

      <div class="md-searchbar" id="md-searchbar">
        <input type="text" id="md-search-input" placeholder="搜索文档内容…" autocomplete="off" spellcheck="false">
        <span class="md-search-count" id="md-search-count">0/0</span>
        <button class="icon-btn" id="md-search-prev" title="上一个">↑</button>
        <button class="icon-btn" id="md-search-next" title="下一个">↓</button>
        <button class="icon-btn" id="md-search-close" title="关闭 (Esc)">✕</button>
      </div>

      <div class="md-body">
        <div class="md-sidebar-backdrop" id="md-sidebar-backdrop"></div>
        <aside class="md-sidebar" id="md-sidebar">
          <div class="md-sidebar-inner">
            <div class="md-side-title">文件</div>
            <ul class="md-file-list" id="md-file-list"></ul>
            <div class="md-side-title">大纲</div>
            <ul class="md-toc" id="md-toc"></ul>
          </div>
        </aside>
        <main class="md-content" id="md-content">
          <article class="md-article" id="md-article"></article>
        </main>
      </div>
      <div class="md-progress"><i id="md-progress-bar"></i></div>
      <div class="md-drop-hint" id="md-drop-hint">松开以打开 Markdown 文件</div>
    </div>`,

  mount(root, ctx){
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const state = { docs: [], cur: -1, fontSize: 16 };
    let headEls = [];
    let rafId = null;
    let dragDepth = 0;
    
    const search = { query: '', marks: [], index: -1, timer: null };

    // UI 元素引用
    const article = $('#md-article');
    const content = $('#md-content');
    const fileList = $('#md-file-list');
    const toc = $('#md-toc');
    const searchBar = $('#md-searchbar');
    const searchInput = $('#md-search-input');
    const searchCount = $('#md-search-count');
    const dropHint = $('#md-drop-hint');
    const progressBar = $('#md-progress-bar');
    const sidebar = $('#md-sidebar');
    const backdrop = $('#md-sidebar-backdrop');

    // 侧边栏自适应逻辑
    const isMobile = () => window.innerWidth <= 780;

    function updateSidebarState(open) {
      if (isMobile()) {
        sidebar.classList.toggle('collapsed', !open);
        backdrop.classList.toggle('show', open);
      } else {
        sidebar.classList.toggle('collapsed', !open);
        backdrop.classList.remove('show');
      }
    }

    function toggleSidebar() {
      if (isMobile()) {
        const isOpen = !sidebar.classList.contains('collapsed');
        updateSidebarState(!isOpen);
      } else {
        const isCollapsed = sidebar.classList.contains('collapsed');
        updateSidebarState(isCollapsed);
      }
    }

    let lastIsMobile = isMobile();
    updateSidebarState(!lastIsMobile); // 桌面端默认展开，移动端默认收起

    ctx.on(window, 'resize', () => {
      const nowMobile = isMobile();
      if (lastIsMobile !== nowMobile) {
        updateSidebarState(!nowMobile);
        lastIsMobile = nowMobile;
      }
    });

    // 1. 文件读取
    function readFile(file){
      return new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => {
          const buf = fr.result; let text;
          try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
          catch(e){ try{ text = new TextDecoder('gbk').decode(buf); } catch(e2){ text = new TextDecoder('utf-8').decode(buf); } }
          resolve({ name: file.name, content: text.replace(/^\uFEFF/, '') });
        };
        fr.onerror = () => resolve({ name: file.name, content: '（文件读取失败）' });
        fr.readAsArrayBuffer(file);
      });
    }

    async function openFiles(fileList){
      const files = Array.from(fileList).filter(f => f && f.size < 80 * 1024 * 1024);
      if(!files.length) return;
      const docs = await Promise.all(files.map(readFile));
      const startIdx = state.docs.length;
      docs.forEach(d => state.docs.push(d));
      renderFileList();
      selectDoc(startIdx);
    }

    function selectDoc(idx){
      if(idx < 0 || idx >= state.docs.length) return;
      state.cur = idx;
      renderFileList();
      renderDoc();
    }

    // 2. 渲染
    function welcomeHtml(){
      return '<div class="md-welcome"><h1>📖 Markdown 阅读器</h1><p>把 <code>.md</code> 文件拖到这个窗口，或点击右上角「打开文件」</p><p style="margin-top:2em;font-size:13px">快捷键：Ctrl+O 打开文件 · Ctrl+F 搜索</p></div>';
    }

    function renderDoc(){
      const doc = state.docs[state.cur];
      if(!doc){
        article.innerHTML = welcomeHtml();
        $('#md-doc-title').textContent = 'Markdown 阅读器';
        headEls = []; buildToc(); resetSearchState(); updateProgress();
        return;
      }
      article.innerHTML = mdToHtml(doc.content);
      $('#md-doc-title').textContent = doc.name;
      headEls = Array.from(article.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      buildToc(); enhance(); content.scrollTop = 0; updateProgress(); updateActiveHeading();
      if(isSearchOpen() && search.query) runSearch(); else resetSearchState();
    }

    function enhance(){
      $$('.copy-btn', article).forEach(btn => {
        ctx.on(btn, 'click', () => {
          const code = btn.closest('.code-wrap').querySelector('code');
          const text = code ? code.textContent : '';
          App.ui.copyText(text, btn);
        });
      });
    }

    function renderFileList(){
      fileList.innerHTML = '';
      if(!state.docs.length){ fileList.innerHTML = '<li class="md-empty">还没有文件</li>'; return; }
      state.docs.forEach((d, k) => {
        const li = document.createElement('li');
        li.className = 'md-file-item' + (k === state.cur ? ' active' : '');
        li.title = d.name;
        const name = document.createElement('span'); name.className = 'md-file-name'; name.textContent = d.name;
        const close = document.createElement('button'); close.className = 'md-close-btn'; close.textContent = '×'; close.title = '关闭';
        ctx.on(close, 'click', e => {
          e.stopPropagation();
          state.docs.splice(k, 1);
          if(k < state.cur) state.cur--;
          if(state.cur >= state.docs.length) state.cur = state.docs.length - 1;
          renderFileList(); renderDoc();
        });
        li.appendChild(name); li.appendChild(close);
        ctx.on(li, 'click', () => {
          selectDoc(k);
          if (isMobile()) updateSidebarState(false); // 移动端点击文件后自动收起
        });
        fileList.appendChild(li);
      });
    }

    function buildToc(){
      toc.innerHTML = '';
      if(!headings.length){ toc.innerHTML = '<li class="md-empty">无标题</li>'; return; }
      headings.forEach(h => {
        const li = document.createElement('li'); li.className = 'md-toc-item lv' + h.level;
        const a = document.createElement('a'); a.textContent = h.text.replace(/[*_`~\[\]]/g, '').trim() || '(空)'; a.href = '#' + h.id; a.dataset.id = h.id;
        ctx.on(a, 'click', e => { 
          e.preventDefault(); 
          const el = document.getElementById(h.id); 
          if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
          if (isMobile()) updateSidebarState(false); // 移动端点击大纲后自动收起
        });
        li.appendChild(a); toc.appendChild(li);
      });
    }

    function setActiveToc(id){ $$('.md-toc-item a', toc).forEach(a => a.classList.toggle('active', a.dataset.id === id)); }
    function updateActiveHeading(){
      if(!headEls.length){ setActiveToc(null); return; }
      const threshold = content.getBoundingClientRect().top + 100; let activeId = null;
      for(const el of headEls){ if(el.getBoundingClientRect().top <= threshold) activeId = el.id; else break; }
      setActiveToc(activeId);
    }

    function updateProgress(){
      const max = content.scrollHeight - content.clientHeight;
      progressBar.style.width = (max > 0 ? Math.min(1, content.scrollTop / max) * 100 : 0) + '%';
    }

    // 3. 搜索逻辑
    function isSearchOpen(){ return searchBar.classList.contains('open'); }
    
    function collectTextNodes(rootNode){
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = node.parentElement;
          if(!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const out = []; let n; while((n = walker.nextNode())) out.push(n); return out;
    }

    function clearSearchMarks(){
      article.querySelectorAll('mark.search-hit').forEach(m => {
        const parent = m.parentNode;
        if(parent){ parent.replaceChild(document.createTextNode(m.textContent), m); parent.normalize(); }
      });
      search.marks = []; search.index = -1;
    }

    function updateSearchCount(){
      const total = search.marks.length;
      searchCount.textContent = total ? ((search.index >= 0 ? search.index : 0) + 1) + '/' + total : '0/0';
    }

    function runSearch(){
      if(search.timer) ctx.clearTimeout(search.timer);
      clearSearchMarks();
      const q = searchInput.value; search.query = q;
      if(!q){ updateSearchCount(); return; }
      
      const nodes = collectTextNodes(article), lowerQ = q.toLowerCase(); let total = 0;
      for(const node of nodes){
        const text = node.nodeValue, lower = text.toLowerCase();
        let idx = lower.indexOf(lowerQ);
        if(idx === -1) continue;
        const frag = document.createDocumentFragment(); let last = 0;
        while(idx !== -1){
          if(idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
          const mark = document.createElement('mark'); mark.className = 'search-hit'; mark.textContent = text.slice(idx, idx + q.length);
          frag.appendChild(mark); total++; last = idx + q.length; idx = lower.indexOf(lowerQ, last);
        }
        if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        if(node.parentNode) node.parentNode.replaceChild(frag, node);
      }
      search.marks = Array.from(article.querySelectorAll('mark.search-hit'));
      search.index = -1;
      if(total > 0) goToHit(0);
      updateSearchCount();
    }

    function goToHit(i){
      const marks = search.marks;
      if(!marks.length) return;
      i = ((i % marks.length) + marks.length) % marks.length;
      marks.forEach(m => m.classList.remove('current'));
      marks[i].classList.add('current'); search.index = i;
      marks[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      updateSearchCount();
    }

    function resetSearchState(){ search.marks = []; search.index = -1; updateSearchCount(); }

    function openSearch(){
      searchBar.classList.add('open');
      requestAnimationFrame(() => { searchInput.focus(); searchInput.select(); });
      if(searchInput.value.trim()) runSearch();
    }

    function closeSearch(){
      if(search.timer) ctx.clearTimeout(search.timer);
      searchInput.blur(); searchBar.classList.remove('open'); searchInput.value = ''; search.query = '';
      clearSearchMarks(); updateSearchCount();
    }

    // 4. 字号控制
    function setFontSize(px){
      state.fontSize = Math.max(12, Math.min(26, px));
      // 将变量设置到 .page-markdown 容器上，而不是最外层的 root，避免被 CSS 默认值覆盖
      const pageEl = $('.page-markdown');
      if (pageEl) pageEl.style.setProperty('--m-font-size', state.fontSize + 'px');
      $('#md-font-reset').textContent = state.fontSize;
    }

    // 5. 事件绑定
    ctx.on($('#md-open-btn'), 'click', () => $('#md-file-input').click());
    ctx.on($('#md-file-input'), 'change', e => { if(e.target.files.length) openFiles(e.target.files); e.target.value = ''; });
    
    ctx.on($('#md-sidebar-btn'), 'click', () => toggleSidebar());
    ctx.on(backdrop, 'click', () => updateSidebarState(false));

    ctx.on($('#md-font-up'), 'click', () => setFontSize(state.fontSize + 1));
    ctx.on($('#md-font-down'), 'click', () => setFontSize(state.fontSize - 1));
    ctx.on($('#md-font-reset'), 'click', () => setFontSize(16));

    ctx.on($('#md-search-btn'), 'click', () => isSearchOpen() ? closeSearch() : openSearch());
    ctx.on($('#md-search-close'), 'click', closeSearch);
    ctx.on($('#md-search-prev'), 'click', () => { if(search.marks.length) goToHit(search.index - 1); });
    ctx.on($('#md-search-next'), 'click', () => { if(search.marks.length) goToHit(search.index + 1); });
    ctx.on(searchInput, 'input', () => { if(search.timer) ctx.clearTimeout(search.timer); search.timer = ctx.setTimeout(runSearch, 220); });
    ctx.on(searchInput, 'keydown', e => {
      if(e.isComposing) return;
      if(e.key === 'Enter'){ e.preventDefault(); if(search.marks.length) goToHit(search.index + (e.shiftKey ? -1 : 1)); }
      else if(e.key === 'Escape'){ e.preventDefault(); closeSearch(); }
    });

    ctx.on(content, 'scroll', () => {
      if(rafId) return;
      rafId = ctx.raf(() => { rafId = null; updateProgress(); updateActiveHeading(); });
    }, { passive: true });

    // 拖拽支持
    ctx.on(root, 'dragenter', e => { e.preventDefault(); dragDepth++; dropHint.classList.add('show'); });
    ctx.on(root, 'dragover', e => { e.preventDefault(); });
    ctx.on(root, 'dragleave', e => { e.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if(!dragDepth) dropHint.classList.remove('show'); });
    ctx.on(root, 'drop', e => {
      e.preventDefault(); dragDepth = 0; dropHint.classList.remove('show');
      if(e.dataTransfer && e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
    });

    // 快捷键
    ctx.onActive(window, 'keydown', e => {
      if(e.key === 'Escape' && isSearchOpen()){ closeSearch(); return; }
      const mod = e.ctrlKey || e.metaKey; if(!mod) return;
      const k = e.key.toLowerCase();
      if(k === 'o'){ e.preventDefault(); $('#md-file-input').click(); }
      else if(k === 'f'){ e.preventDefault(); openSearch(); }
      else if(k === 'b'){ e.preventDefault(); toggleSidebar(); }
      else if(k === '=' || k === '+'){ e.preventDefault(); setFontSize(state.fontSize + 1); }
      else if(k === '-'){ e.preventDefault(); setFontSize(state.fontSize - 1); }
    });

    // 首次初始化
    renderFileList(); renderDoc(); setFontSize(16);
  }
});
})(window);
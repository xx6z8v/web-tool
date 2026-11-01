(function(global){
'use strict';
const App = global.App;

App.registerPage('markdown-editor', {
  title: 'Markdown 编辑器',

  template: () => `
    <div class="page page-markdown-editor">
      <header class="me-topbar">
        <div class="me-actions">
          <button id="me-undo" type="button" title="撤销 (Ctrl+Z)">↶ 撤销</button>
          <button id="me-redo" type="button" title="恢复 (Ctrl+Y)">↷ 恢复</button>
          <button id="me-exportHtml" type="button">导出 HTML</button>
          <button id="me-downloadMd" type="button">下载 .md</button>
        </div>
      </header>

      <div class="me-toolbar" id="me-toolbar"></div>

      <main class="me-panes">
        <section class="me-pane">
          <textarea id="me-editor" spellcheck="false" placeholder="在这里输入 Markdown 内容……"></textarea>
        </section>
        <div class="me-divider"></div>
        <section class="me-pane">
          <div id="me-preview" class="markdown-body"></div>
        </section>
      </main>

      <footer class="me-statusbar">
        <span id="me-wordCount">0 字符</span>
        <span id="me-cursorPos">行 1, 列 1</span>
      </footer>
    </div>`,

  mount(root, ctx) {
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const editor   = $('#me-editor');
    const preview  = $('#me-preview');
    const toolbar  = $('#me-toolbar');
    const wordCountEl = $('#me-wordCount');
    const cursorPosEl = $('#me-cursorPos');
    const undoBtn  = $('#me-undo');
    const redoBtn  = $('#me-redo');

    // --- 解析器 ---
    function escapeHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function inline(text) {
      const codes = [];
      text = text.replace(/`([^`\n]+)`/g, (m, c) => {
        codes.push(c);
        return '\u0000C' + (codes.length - 1) + '\u0000';
      });
      text = escapeHtml(text);
      text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, alt, src, title) => `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''}>`);
      text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (m, t, href, title) => `<a href="${href}" target="_blank" rel="noopener"${title ? ` title="${title}"` : ''}>${t}</a>`);
      text = text.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/(^|[^_\w])__([^_\n]+?)__(?![\w_])/g, '$1<strong>$2</strong>');
      text = text.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
      text = text.replace(/(^|[^_\w])_([^_\n]+?)_(?![\w_])/g, '$1<em>$2</em>');
      text = text.replace(/~~([^\n]+?)~~/g, '<del>$1</del>');
      text = text.replace(/\u0000C(\d+)\u0000/g, (m, i) => `<code>${escapeHtml(codes[+i])}</code>`);
      return text;
    }

    function splitRow(line) {
      let s = line.trim();
      if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|')) s = s.slice(0, -1);
      return s.split('|').map(c => c.trim());
    }

    function parseListBlock(rawLines) {
      const items = [];
      for (const line of rawLines) {
        const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (m) {
          items.push({ indent: m[1].replace(/\t/g, '  ').length, ordered: /^\d/.test(m[2]), text: m[3] });
        } else if (items.length) {
          items[items.length - 1].text += ' ' + line.trim();
        }
      }
      if (!items.length) return '';
      return buildList(items, 0, items[0].indent)[0];
    }

    function buildList(items, start, indent) {
      const ordered = items[start].ordered;
      const tag = ordered ? 'ol' : 'ul';
      let html = '';
      let i = start;
      while (i < items.length && items[i].indent >= indent) {
        if (items[i].indent > indent) {
          const [sub, next] = buildList(items, i, items[i].indent);
          html = html.replace(/<\/li>$/, sub + '</li>');
          i = next;
          continue;
        }
        if (items[i].ordered !== ordered && html) break;
        html += `<li>${inline(items[i].text)}</li>`;
        i++;
      }
      return [`<${tag}>${html}</${tag}>`, i];
    }

    function parseMarkdown(md) {
      const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
      const out = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (/^\s*```/.test(line)) {
          const lang = line.trim().slice(3).trim();
          const buf = [];
          i++;
          while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
          i++;
          out.push(`<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`);
          continue;
        }
        if (line.trim() === '') { i++; continue; }
        if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(line.trim())) { out.push('<hr>'); i++; continue; }
        let m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (m) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
        if (/^\s*>\s?/.test(line)) {
          const buf = [];
          while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
          out.push(`<blockquote>${parseMarkdown(buf.join('\n'))}</blockquote>`);
          continue;
        }
        if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
          const headers = splitRow(line);
          i += 2;
          const rows = [];
          while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') { rows.push(splitRow(lines[i])); i++; }
          out.push('<table><thead><tr>' + headers.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
          continue;
        }
        if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
          const buf = [];
          while (i < lines.length) {
            if (/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && lines[i].trim() !== '')) { buf.push(lines[i]); i++; } else break;
          }
          out.push(parseListBlock(buf));
          continue;
        }
        const buf = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|>|```|\s*([-*+]|\d+\.)\s)/.test(lines[i]) && !/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        out.push(`<p>${inline(buf.join('\n'))}</p>`);
      }
      return out.join('\n');
    }

    // --- 核心逻辑 ---
    const MAX_HISTORY = 50;
    let historyStack = [];
    let historyIndex = -1;
    let historyTimer = null;
    let saveTimer = null;
    let syncRaf = null;

    function recordHistory() {
      const currentContent = editor.value;
      if (historyIndex >= 0 && historyStack[historyIndex] === currentContent) return;

      if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
      }

      historyStack.push(currentContent);
      if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
      } else {
        historyIndex++;
      }
      updateUndoRedoBtns();
    }

    function debouncedRecordHistory() {
      if (historyTimer) ctx.clearTimeout(historyTimer);
      historyTimer = ctx.setTimeout(recordHistory, 600);
    }

    function undo() {
      if (historyIndex > 0) {
        historyIndex--;
        editor.value = historyStack[historyIndex];
        update();
        updateUndoRedoBtns();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      }
    }

    function redo() {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        editor.value = historyStack[historyIndex];
        update();
        updateUndoRedoBtns();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      }
    }

    function updateUndoRedoBtns() {
      undoBtn.disabled = historyIndex <= 0;
      redoBtn.disabled = historyIndex >= historyStack.length - 1;
    }

    function saveToHistoryImmediately() {
      if (historyTimer) ctx.clearTimeout(historyTimer);
      recordHistory();
    }

    function wrap(before, after, placeholder) {
      const s = editor.selectionStart, e = editor.selectionEnd;
      const sel = editor.value.slice(s, e);
      const text = sel || placeholder || '';
      editor.setRangeText(before + text + after, s, e, 'end');
      if (!sel) {
        editor.selectionStart = s + before.length;
        editor.selectionEnd = s + before.length + text.length;
      }
      editor.focus();
      update();
      saveToHistoryImmediately();
    }

    function linePrefix(prefix, ordered) {
      const s = editor.selectionStart, e = editor.selectionEnd, v = editor.value;
      const start = v.lastIndexOf('\n', s - 1) + 1;
      let end = v.indexOf('\n', e);
      if (end === -1) end = v.length;
      const lines = v.slice(start, end).split('\n');
      const result = lines.map((l, i) => (ordered ? (i + 1) + '. ' : prefix) + l).join('\n');
      editor.setRangeText(result, start, end, 'end');
      editor.focus();
      update();
      saveToHistoryImmediately();
    }

    function insertAtCursor(str) {
      const s = editor.selectionStart, e = editor.selectionEnd;
      editor.setRangeText(str, s, e, 'end');
      editor.focus();
      update();
      saveToHistoryImmediately();
    }

    function codeBlock() {
      const s = editor.selectionStart, e = editor.selectionEnd;
      const sel = editor.value.slice(s, e);
      const fence = '```';
      const block = fence + 'js\n' + (sel || '// 代码') + '\n' + fence;
      editor.setRangeText(block, s, e, 'end');
      editor.focus();
      update();
      saveToHistoryImmediately();
    }

    function insertTable() {
      insertAtCursor('\n| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |\n');
    }

    const TOOLS = [
      { label: 'H1', action: () => linePrefix('# ') },
      { label: 'H2', action: () => linePrefix('## ') },
      { label: 'H3', action: () => linePrefix('### ') },
      { sep: true },
      { label: 'B', style: 'font-weight:700', action: () => wrap('**', '**', '加粗') },
      { label: 'I', style: 'font-style:italic', action: () => wrap('*', '*', '斜体') },
      { label: 'S', style: 'text-decoration:line-through', action: () => wrap('~~', '~~', '删除') },
      { sep: true },
      { label: '`', action: () => wrap('`', '`', '代码') },
      { label: '</>', action: codeBlock },
      { label: '🔗', action: () => wrap('[', '](url)', '链接') },
      { label: '🖼', action: () => wrap('![', '](url)', '图片') },
      { sep: true },
      { label: '❝', action: () => linePrefix('> ') },
      { label: '•', action: () => linePrefix('- ') },
      { label: '1.', action: () => linePrefix('', true) },
      { label: '▦', action: insertTable },
      { label: '—', action: () => insertAtCursor('\n---\n') }
    ];

    // 初始化工具栏
    TOOLS.forEach(t => {
      if (t.sep) {
        const d = document.createElement('span');
        d.className = 'sep';
        toolbar.appendChild(d);
        return;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t.label;
      if (t.style) b.setAttribute('style', t.style);
      ctx.on(b, 'click', t.action);
      toolbar.appendChild(b);
    });

    function save() {
      if (saveTimer) ctx.clearTimeout(saveTimer);
      saveTimer = ctx.setTimeout(() => {
        try { localStorage.setItem('toolbox:md-editor', editor.value); } catch (e) {}
      }, 250);
    }

    function updateStatus() {
      const v = editor.value;
      const cn = (v.match(/[\u4e00-\u9fa5]/g) || []).length;
      const en = (v.match(/[A-Za-z0-9]+/g) || []).length;
      wordCountEl.textContent = `${v.length} 字符 · ${cn + en} 词`;

      const pos = editor.selectionStart;
      const before = v.slice(0, pos);
      const line = before.split('\n').length;
      const col = pos - before.lastIndexOf('\n');
      cursorPosEl.textContent = `行 ${line}, 列 ${col}`;
    }

    function update() {
      preview.innerHTML = parseMarkdown(editor.value);
      updateStatus();
      save();
    }

    // --- 事件绑定 ---
    ctx.on(editor, 'input', () => {
      update();
      debouncedRecordHistory();
    });

    ['keyup', 'click', 'select', 'focus'].forEach(ev => {
      ctx.on(editor, ev, updateStatus);
    });

    ctx.on(editor, 'scroll', () => {
      if (syncRaf) return;
      syncRaf = ctx.raf(() => {
        syncRaf = null;
        const max = editor.scrollHeight - editor.clientHeight;
        if (max <= 0) return;
        const ratio = editor.scrollTop / max;
        preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
      });
    });

    ctx.on(editor, 'keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
        update();
        saveToHistoryImmediately();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (k === 'y') {
          e.preventDefault();
          redo();
        } else if (k === 'b') { e.preventDefault(); wrap('**', '**', '加粗'); }
        else if (k === 'i') { e.preventDefault(); wrap('*', '*', '斜体'); }
        else if (k === 'k') { e.preventDefault(); wrap('[', '](url)', '链接'); }
      }
    });

    ctx.on(undoBtn, 'click', undo);
    ctx.on(redoBtn, 'click', redo);

    // --- 导出逻辑 ---
    function download(filename, content, mime) {
      const blob = new Blob([content], { type: mime + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      ctx.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    ctx.on($('#me-downloadMd'), 'click', () => {
      download('document.md', editor.value, 'text/markdown');
    });

    ctx.on($('#me-exportHtml'), 'click', () => {
      const h1 = editor.value.match(/^#\s+(.+)$/m);
      const title = escapeHtml(h1 ? h1[1] : 'Markdown 文档');
      const body = parseMarkdown(editor.value);
      const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { max-width: 820px; margin: 40px auto; padding: 0 20px; font-family: -apple-system, "Segoe UI", "PingFang SC", sans-serif; line-height: 1.75; color: #24292f; }
  h1, h2 { border-bottom: 1px solid #e1e4e8; padding-bottom: .3em; }
  code { background: #f0f2f5; padding: .15em .4em; border-radius: 4px; font-size: .9em; }
  pre { background: #f0f2f5; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: .9em 0; padding: .2em 1em; border-left: 4px solid #0969da; background: #f6f8fa; color: #6a737d; }
  table { border-collapse: collapse; } th, td { border: 1px solid #e1e4e8; padding: 6px 14px; } th { background: #f6f8fa; }
</style>
</head>
<body>${body}</body>
</html>`;
      download('document.html', doc, 'text/html');
    });

    // --- 初始化 ---
    const SAMPLE = `# Markdown 编辑器

这是一个用 **HTML + CSS + JavaScript** 写的 Markdown 编辑器。

## 主要特性
- 左侧编辑，右侧实时预览
- 顶部工具栏一键插入格式
- 支持撤销(50步)与恢复：快捷键 \`Ctrl/Cmd + Z\` 及 \`Ctrl/Cmd + Y\`
- 移动端工具栏支持横向滑动

> 尝试修改这段文字，然后按下撤销按钮看看效果吧！`;

    let saved = null;
    try { saved = localStorage.getItem('toolbox:md-editor'); } catch (e) {}
    editor.value = saved !== null && saved !== '' ? saved : SAMPLE;

    update();
    historyStack = [editor.value];
    historyIndex = 0;
    updateUndoRedoBtns();
  }
});
})(window);
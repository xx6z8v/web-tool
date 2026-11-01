(function(global){
'use strict';
const App = global.App;

App.registerPage('zip-tool', {
  title: 'ZIP 压缩解压',

  template: () => `
    <div class="page page-zip-tool">
      <div class="zip-workspace">

        <!-- ============ 左侧：控制台 ============ -->
        <div class="zip-col">
          <!-- 1. 压缩包预览区 -->
          <div class="zip-zone grow">
            <div class="zip-zone-header">
              <div class="zip-zone-title">
                <span class="label">📦 压缩包</span>
                <span class="zip-zone-badge muted" id="zipArchiveBadge" style="display:none">—</span>
              </div>
              <button class="zip-toolbar-btn danger" id="zipArchiveRemove" style="display:none; padding:2px 8px;">移除</button>
            </div>
            <div class="zip-zone-body" style="padding: 8px;">
              <div class="zip-drop" id="zipArchiveDrop">
                <input type="file" id="zipArchiveInput" accept=".zip,application/zip,application/x-zip-compressed">
                <div class="zip-drop-icon">📦</div>
                <div class="zip-drop-text">拖入 .zip 文件</div>
                <div class="zip-drop-sub">或点击选择</div>
              </div>
              <div id="zipArchiveCardWrap" style="display:none; flex:1; display:flex;"></div>
            </div>
          </div>

          <!-- 2. 控制台操作区 -->
          <div class="zip-zone shrink zip-console">
            <!-- 核心按钮 -->
            <div class="console-actions">
              <button class="action-btn" id="zipUnzipBtn" disabled>
                <span class="arrow">→</span>
                <span class="action-label">解压到右侧</span>
              </button>
              <button class="action-btn" id="zipCompressBtn" disabled>
                <span class="arrow">←</span>
                <span class="action-label">从右侧压缩</span>
              </button>
            </div>

            <!-- 下载按钮（仅生成包后显示） -->
            <button class="btn-dl-archive" id="zipArchiveDownload" style="display:none">
              ⬇ 下载生成的 ZIP
            </button>

            <!-- 选项 -->
            <div class="console-options">
              <div class="opt-row">
                <span class="opt-label">文件名</span>
                <input type="text" class="opt-input" id="zipOutputName" placeholder="archive.zip">
              </div>
              <div class="opt-row">
                <span class="opt-label">压缩级别</span>
                <select class="opt-select" id="zipLevel">
                  <option value="0">0 存储</option>
                  <option value="1">1 最快</option>
                  <option value="6" selected>6 默认</option>
                  <option value="9">9 最小</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ 右侧：文件工作区 ============ -->
        <div class="zip-col">
          <div class="zip-zone grow">
            <div class="zip-zone-header">
              <div class="zip-zone-title">
                <span class="label">📄 文件（夹）</span>
                <span class="zip-zone-badge muted" id="zipFilesBadge" style="display:none">—</span>
              </div>
              <button class="zip-toolbar-btn" id="zipFilesSelectAll" style="display:none">全选</button>
              <button class="zip-toolbar-btn danger" id="zipFilesClear" style="display:none">清空</button>
            </div>
            <div class="zip-zone-body">
              <div class="zip-drop" id="zipFilesDrop" style="min-height: 100px;">
                <input type="file" id="zipFilesInput" multiple>
                <div class="zip-drop-icon" style="font-size: 24px;">📄</div>
                <div class="zip-drop-text" style="font-size: var(--fs-sm);">拖入文件或文件夹</div>
              </div>
              <div class="zip-files-list" id="zipFilesList" style="display:none"></div>
              <div class="zip-empty" id="zipFilesEmpty">
                <span>暂无文件</span>
                <span style="font-size: var(--fs-xs);">解压压缩包，或拖入文件 / 文件夹</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>`,

  mount(root, ctx) {
    const $ = id => root.querySelector('#' + id);

    /* ---------- DOM ---------- */
    const archiveDrop     = $('zipArchiveDrop');
    const archiveInput    = $('zipArchiveInput');
    const archiveBadge    = $('zipArchiveBadge');
    const archiveCardWrap = $('zipArchiveCardWrap');
    const archiveDownload = $('zipArchiveDownload');
    const archiveRemove   = $('zipArchiveRemove');

    const unzipBtn        = $('zipUnzipBtn');
    const compressBtn     = $('zipCompressBtn');

    const filesDrop       = $('zipFilesDrop');
    const filesInput      = $('zipFilesInput');
    const filesList       = $('zipFilesList');
    const filesBadge      = $('zipFilesBadge');
    const filesSelectAll  = $('zipFilesSelectAll');
    const filesClear      = $('zipFilesClear');
    const filesEmpty      = $('zipFilesEmpty');

    const outputNameInput = $('zipOutputName');
    const zipLevelSel     = $('zipLevel');

    /* ---------- State ---------- */
    const state = {
      archive: null, // { name, size, type: 'input'|'output', file?: File, blob?: Blob, stats? }
      files: []      // [{ name, path, size, data?, file?, selected: boolean }]
    };

    /* ---------- 工具 ---------- */
    function formatSize(bytes) {
      if (!bytes) return '0 B';
      const k = 1024, sizes = ['B','KB','MB','GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }
    function escapeHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    function checkFflate() {
      if (typeof fflate === 'undefined') throw new Error('fflate 未加载，请确认 js/lib/fflate.js 已引入。');
    }
    function looksLikeText(u8) {
      if (!u8) return false;
      const len = Math.min(u8.length, 4096);
      if (len === 0) return true;
      let bad = 0;
      for (let i = 0; i < len; i++) {
        const b = u8[i];
        if (b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126) || b >= 128) continue;
        bad++;
      }
      return bad / len < 0.05;
    }
    function uniquePath(basePath, list) {
      if (!list.some(p => p.path === basePath)) return basePath;
      const dot = basePath.lastIndexOf('.');
      const name = dot > 0 ? basePath.slice(0, dot) : basePath;
      const ext  = dot > 0 ? basePath.slice(dot) : '';
      let i = 1, candidate;
      do { candidate = `${name} (${i})${ext}`; i++; }
      while (list.some(p => p.path === candidate));
      return candidate;
    }

    /* ---------- 按钮状态同步 ---------- */
    function updateButtons() {
      unzipBtn.disabled = !(state.archive && state.archive.type === 'input' && state.archive.file);
      const selectedCount = state.files.filter(f => f.selected).length;
      compressBtn.disabled = selectedCount === 0;
      
      // 动态更新压缩按钮提示
      const compHint = compressBtn.querySelector('.action-label');
      if (compHint) compHint.textContent = selectedCount > 0 ? `从右侧压缩(${selectedCount})` : '从右侧压缩';
    }

    /* ---------- 渲染：左侧压缩包 ---------- */
    function renderArchive() {
      if (!state.archive) {
        archiveDrop.style.display = '';
        archiveDrop.classList.remove('compact');
        archiveCardWrap.style.display = 'none';
        archiveCardWrap.innerHTML = '';
        archiveDownload.style.display = 'none';
        archiveRemove.style.display = 'none';
        archiveBadge.style.display = 'none';
        return;
      }
      // 有包的时候，把拖入区变成一个小条，把卡片显示出来
      archiveDrop.style.display = '';
      archiveDrop.classList.add('compact');
      archiveCardWrap.style.display = 'flex';
      archiveRemove.style.display = '';
      archiveBadge.style.display = '';

      const isInput = state.archive.type === 'input';
      archiveBadge.className = 'zip-zone-badge ' + (isInput ? 'muted' : '');
      archiveBadge.textContent = isInput ? '待解压' : '已生成';

      const statsHtml = state.archive.stats
        ? `<div class="zip-stats-chips">
            <span>原始 <b>${formatSize(state.archive.stats.originalSize)}</b></span>
            <span>压缩后 <b>${formatSize(state.archive.stats.compressedSize)}</b></span>
            <span>比例 <b>${state.archive.stats.ratio}%</b></span>
           </div>` : '';

      archiveCardWrap.innerHTML = `
        <div class="zip-archive-card">
          <div class="zip-archive-icon">${isInput ? '📦' : '📤'}</div>
          <div class="zip-archive-name">${escapeHtml(state.archive.name)}</div>
          <div class="zip-archive-meta">${formatSize(state.archive.size)}${isInput ? '' : ' · 已压缩'}</div>
          ${statsHtml}
        </div>`;

      archiveDownload.style.display = isInput ? 'none' : '';
    }

    /* ---------- 渲染：右侧文件 ---------- */
    function renderFiles() {
      const hasFiles = state.files.length > 0;
      filesDrop.style.display = '';
      filesDrop.classList.toggle('compact', hasFiles);
      filesEmpty.style.display = hasFiles ? 'none' : '';
      filesList.style.display = hasFiles ? '' : 'none';
      filesSelectAll.style.display = hasFiles ? '' : 'none';
      filesClear.style.display = hasFiles ? '' : 'none';

      if (!hasFiles) {
        filesBadge.style.display = 'none';
        filesList.innerHTML = '';
        return;
      }

      filesBadge.style.display = '';
      const totalSize = state.files.reduce((s, f) => s + f.size, 0);
      const selectedCount = state.files.filter(f => f.selected).length;
      filesBadge.className = 'zip-zone-badge';
      filesBadge.textContent = `${state.files.length} 个 · ${formatSize(totalSize)}`;

      filesSelectAll.textContent = selectedCount === state.files.length ? '取消全选' : '全选';

      filesList.innerHTML = state.files.map((f, idx) => {
        const dirPart = f.path && f.path !== f.name
          ? `<span class="path">${escapeHtml(f.path.slice(0, f.path.length - f.name.length))}</span>` : '';
        return `
          <div class="zip-file-item ${f.selected ? 'selected' : ''}">
            <input type="checkbox" class="zip-file-check" data-idx="${idx}" ${f.selected ? 'checked' : ''}>
            <span class="zip-file-name" data-idx="${idx}" title="点击预览内容">
              📄 ${dirPart}${escapeHtml(f.name)}
            </span>
            <span class="zip-file-size">${formatSize(f.size)}</span>
            <button class="zip-file-btn dl" data-idx="${idx}" title="下载">⬇</button>
            <button class="zip-file-btn remove" data-idx="${idx}" title="移除">✕</button>
          </div>`;
      }).join('');
    }

    /* ---------- 左侧：接收压缩包 ---------- */
    function setArchiveInput(file) {
      if (!file) return;
      const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
      if (!isZip) { App.toast('请选择 .zip 格式的文件', 'warn'); return; }
      state.archive = { name: file.name, size: file.size, type: 'input', file };
      renderArchive();
      updateButtons();
    }

    ctx.on(archiveInput, 'change', e => { const file = e.target.files && e.target.files[0]; archiveInput.value = ''; setArchiveInput(file); });
    ['dragenter','dragover'].forEach(ev => {
      ctx.on(archiveDrop, ev, e => { e.preventDefault(); e.stopPropagation(); archiveDrop.classList.add('dragover'); });
    });
    ['dragleave','drop'].forEach(ev => {
      ctx.on(archiveDrop, ev, e => { e.preventDefault(); e.stopPropagation(); archiveDrop.classList.remove('dragover'); });
    });
    ctx.on(archiveDrop, 'drop', e => { const dt = e.dataTransfer; if (dt && dt.files && dt.files.length) setArchiveInput(dt.files[0]); });

    ctx.on(archiveRemove, 'click', () => { state.archive = null; renderArchive(); updateButtons(); });
    ctx.on(archiveDownload, 'click', () => { if (state.archive && state.archive.blob) downloadBlob(state.archive.blob, state.archive.name); });

    /* ---------- 右侧：接收文件 ---------- */
    function addFiles(newFiles) {
      let added = 0;
      for (const entry of newFiles) {
        const path = uniquePath(entry.path, state.files);
        state.files.push({ name: entry.name, path, size: entry.size, file: entry.file || null, data: entry.data || null, selected: true });
        added++;
      }
      if (added > 0) { renderFiles(); updateButtons(); }
    }

    async function readEntry(entry, basePath) {
      if (entry.isFile) {
        const file = await new Promise((res, rej) => entry.file(res, rej));
        return [{ name: file.name, path: basePath + file.name, size: file.size, file }];
      }
      if (entry.isDirectory) {
        const reader = entry.createReader(); const all = []; let batch;
        do { batch = await new Promise((res, rej) => reader.readEntries(res, rej)); all.push(...batch); } while (batch.length > 0);
        const results = [];
        for (const child of all) results.push(...await readEntry(child, basePath + entry.name + '/'));
        return results;
      }
      return [];
    }
    async function extractFromDataTransfer(dt) {
      const out = [];
      if (dt.items && dt.items.length) {
        const entries = [];
        for (let i = 0; i < dt.items.length; i++) {
          const entry = dt.items[i].webkitGetAsEntry && dt.items[i].webkitGetAsEntry();
          if (entry) entries.push(entry);
        }
        if (entries.length) { for (const entry of entries) out.push(...await readEntry(entry, '')); return out; }
      }
      for (const file of dt.files) out.push({ name: file.name, path: file.name, size: file.size, file });
      return out;
    }

    ctx.on(filesInput, 'change', e => {
      const files = Array.from(e.target.files || []); filesInput.value = '';
      if (!files.length) return;
      addFiles(files.map(f => ({ name: f.name, path: f.name, size: f.size, file: f })));
    });

    ['dragenter','dragover'].forEach(ev => {
      ctx.on(filesDrop, ev, e => { e.preventDefault(); e.stopPropagation(); filesDrop.classList.add('dragover'); });
    });
    ['dragleave','drop'].forEach(ev => {
      ctx.on(filesDrop, ev, e => { e.preventDefault(); e.stopPropagation(); filesDrop.classList.remove('dragover'); });
    });
    ctx.on(filesDrop, 'drop', async e => {
      if (!e.dataTransfer) return;
      try {
        const items = await extractFromDataTransfer(e.dataTransfer);
        addFiles(items);
        if (items.length) App.toast(`已添加 ${items.length} 个文件`, 'ok');
      } catch (err) { App.toast('读取拖入文件失败：' + err.message, 'err'); }
    });

    /* ---------- 右侧交互 ---------- */
    ctx.on(filesList, 'change', e => {
      const cb = e.target.closest('.zip-file-check');
      if (!cb) return;
      const idx = +cb.dataset.idx;
      if (state.files[idx]) {
        state.files[idx].selected = cb.checked;
        const item = cb.closest('.zip-file-item');
        if (item) item.classList.toggle('selected', cb.checked);
        updateButtons();
        const selectedCount = state.files.filter(f => f.selected).length;
        filesSelectAll.textContent = selectedCount === state.files.length ? '取消全选' : '全选';
      }
    });

    ctx.on(filesList, 'click', async e => {
      const dlBtn = e.target.closest('.zip-file-btn.dl');
      if (dlBtn) {
        const f = state.files[+dlBtn.dataset.idx];
        if (!f) return;
        if (f.file) downloadBlob(f.file, f.name);
        else if (f.data) downloadBlob(new Blob([f.data], { type: 'application/octet-stream' }), f.name);
        return;
      }
      const rmBtn = e.target.closest('.zip-file-btn.remove');
      if (rmBtn) {
        state.files.splice(+rmBtn.dataset.idx, 1); renderFiles(); updateButtons(); return;
      }
      const nameEl = e.target.closest('.zip-file-name');
      if (nameEl) {
        const idx = +nameEl.dataset.idx, f = state.files[idx];
        if (!f) return;
        const item = nameEl.closest('.zip-file-item');
        const existing = item.querySelector('.zip-file-preview');
        if (existing) { existing.remove(); return; }
        
        let u8 = f.data;
        if (!u8 && f.file) { u8 = new Uint8Array(await f.file.arrayBuffer()); f.data = u8; }
        if (!u8) return;

        const preview = document.createElement('div');
        preview.className = 'zip-file-preview';
        if (looksLikeText(u8)) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(u8);
          preview.textContent = text.length > 1500 ? text.slice(0, 1500) + '\n… (已截断)' : text;
        } else {
          preview.classList.add('binary'); preview.textContent = '二进制文件，无法以文本预览';
        }
        item.appendChild(preview);
      }
    });

    ctx.on(filesSelectAll, 'click', () => {
      const allSelected = state.files.every(f => f.selected);
      state.files.forEach(f => { f.selected = !allSelected; });
      renderFiles(); updateButtons();
    });
    ctx.on(filesClear, 'click', () => { state.files = []; renderFiles(); updateButtons(); });

    /* ---------- 解压核心 ---------- */
    ctx.on(unzipBtn, 'click', async () => {
      if (!state.archive || state.archive.type !== 'input' || !state.archive.file) return;
      unzipBtn.classList.add('loading'); unzipBtn.disabled = true; compressBtn.disabled = true;

      try {
        checkFflate();
        const u8 = new Uint8Array(await state.archive.file.arrayBuffer());
        const unzipped = await new Promise((resolve, reject) => {
          fflate.unzip(u8, (err, data) => err ? reject(err) : resolve(data));
        });

        const newFiles = [];
        for (const name in unzipped) {
          if (name.endsWith('/') || name.startsWith('__MACOSX/') || name.endsWith('.DS_Store') || name === 'Thumbs.db') continue;
          const data = unzipped[name];
          newFiles.push({ name: name.split('/').pop(), path: name, size: data.byteLength, data });
        }

        if (!newFiles.length) {
          App.toast('压缩包内没有可显示的文件', 'warn');
        } else {
          const replacedCount = state.files.length;
          state.files = newFiles.map(f => ({ ...f, selected: true }));
          renderFiles(); updateButtons();
          App.toast(replacedCount > 0 ? `解压完成，替换了原有文件` : `解压完成，共 ${newFiles.length} 个文件`, 'ok');
        }
      } catch (err) {
        console.error(err); App.toast('解压失败：' + (err.message || err), 'err');
      } finally {
        unzipBtn.classList.remove('loading'); updateButtons();
      }
    });

    /* ---------- 压缩核心 ---------- */
    ctx.on(compressBtn, 'click', async () => {
      const selected = state.files.filter(f => f.selected);
      if (!selected.length) return;
      compressBtn.classList.add('loading'); unzipBtn.disabled = true; compressBtn.disabled = true;

      try {
        checkFflate();
        const data = {};
        for (const f of selected) {
          const key = f.path || f.name;
          if (f.data) data[key] = f.data;
          else if (f.file) data[key] = new Uint8Array(await f.file.arrayBuffer());
        }

        const level = parseInt(zipLevelSel.value, 10) || 0;
        const out = await new Promise((resolve, reject) => {
          fflate.zip(data, { level }, (err, result) => err ? reject(err) : resolve(result));
        });
        const blob = new Blob([out], { type: 'application/zip' });

        let outName = outputNameInput.value.trim() || 'archive.zip';
        if (!outName.toLowerCase().endsWith('.zip')) outName += '.zip';

        const originalSize = selected.reduce((s, f) => s + f.size, 0);
        const ratio = originalSize > 0 ? ((blob.size / originalSize) * 100).toFixed(1) : '—';

        state.archive = { name: outName, size: blob.size, type: 'output', blob, stats: { originalSize, compressedSize: blob.size, ratio } };
        
        renderArchive(); updateButtons(); downloadBlob(blob, outName);
        App.toast(`压缩完成（${formatSize(blob.size)}），已下载`, 'ok');
      } catch (err) {
        console.error(err); App.toast('压缩失败：' + (err.message || err), 'err');
      } finally {
        compressBtn.classList.remove('loading'); updateButtons();
      }
    });

    /* ---------- 初始化 ---------- */
    renderArchive(); renderFiles(); updateButtons();
  }
});
})(window);
(function(global){
'use strict';
const App = global.App;

App.registerPage('imagetune', {
  title: '图片处理',
  fullTitle: '🖼️ 图片处理',

  template: () => `
    <div class="page page-imagetune">
      <div class="it-app">

        <p class="it-subtitle">自由缩放 · 裁剪填满 · 圆角/圆形 · 旋转翻转 · 文字水印 · 打包下载</p>

        <div class="it-dropzone" id="itDropZone">
          <div class="dz-icon">📸</div>
          <p class="dz-title">点击选择图片，或拖拽到这里</p>
          <p class="dz-desc"><span>支持多选</span> · JPG / PNG / WebP / AVIF</p>
          <input type="file" id="itFileInput" accept="image/*" multiple hidden>
        </div>

        <!-- 空状态下的功能特色介绍 -->
        <div class="it-features" id="itFeatures">
          <div class="it-feature-card">
            <div class="it-feature-icon">📐</div>
            <div class="it-feature-text">
              <h4>批量缩放裁剪</h4>
              <p>智能裁剪填满，支持定宽、定高、百分比等多种策略</p>
            </div>
          </div>
          <div class="it-feature-card">
            <div class="it-feature-icon">✂️</div>
            <div class="it-feature-text">
              <h4>圆角与旋转</h4>
              <p>一键生成圆形头像，自由旋转和翻转图片方向</p>
            </div>
          </div>
          <div class="it-feature-card">
            <div class="it-feature-icon">🖋️</div>
            <div class="it-feature-text">
              <h4>文字水印</h4>
              <p>自定义水印内容、字号、透明度及显示位置</p>
            </div>
          </div>
          <div class="it-feature-card">
            <div class="it-feature-icon">📦</div>
            <div class="it-feature-text">
              <h4>本地打包下载</h4>
              <p>所有处理在浏览器完成，多张图片一键打包为 ZIP</p>
            </div>
          </div>
        </div>

        <div class="it-filelist" id="itFileList" style="display:none"></div>

        <div class="it-panel" id="itPanel" style="display:none">
          <div class="it-panel-title">⚙️ 处理配置</div>

          <div class="it-section-label">快速预设</div>
          <div class="it-presets">
            <button type="button" class="it-preset-btn" data-preset="avatar">头像 200×200</button>
            <button type="button" class="it-preset-btn" data-preset="avatarCircle">圆形头像 200×200</button>
            <button type="button" class="it-preset-btn" data-preset="thumb">缩略图 400×400</button>
            <button type="button" class="it-preset-btn" data-preset="social">社交 1200×630</button>
            <button type="button" class="it-preset-btn" data-preset="story">竖屏 1080×1920</button>
            <button type="button" class="it-preset-btn" data-preset="half">缩小 50%</button>
            <button type="button" class="it-preset-btn" data-preset="longest">最长边 1200</button>
            <button type="button" class="it-preset-btn" data-preset="original">保持原始尺寸</button>
          </div>

          <div class="it-section-label">尺寸策略</div>
          <div class="it-grid">
            <div class="it-field">
              <label>策略</label>
              <select id="itSizeStrategy">
                <option value="fixed" selected>固定宽高（裁剪填满）</option>
                <option value="percent">按百分比缩放</option>
                <option value="fit-width">定宽，高度自适应</option>
                <option value="fit-height">定高，宽度自适应</option>
                <option value="longest-side">限制最长边</option>
              </select>
            </div>
            <div class="it-field" id="itFieldWidth">
              <label>宽度 (px)</label>
              <input type="number" id="itWidth" value="800" min="1">
            </div>
            <div class="it-field" id="itFieldHeight">
              <label>高度 (px)</label>
              <input type="number" id="itHeight" value="800" min="1">
            </div>
            <div class="it-field hidden" id="itFieldPercent">
              <label>缩放比例 (%)</label>
              <input type="number" id="itPercentInput" value="50" min="1" max="1000">
              <div class="it-hint">50 = 原图一半，200 = 原图两倍</div>
            </div>
            <div class="it-field hidden" id="itFieldLongest">
              <label>最长边上限 (px)</label>
              <input type="number" id="itLongestInput" value="1200" min="1">
              <div class="it-hint">只缩小不放大</div>
            </div>
          </div>

          <div class="it-checkrow">
            <label><input type="checkbox" id="itLockRatio"> 锁定宽高比（固定宽高模式下生效）</label>
            <button type="button" class="btn btn-sm" id="itUseOriginalBtn">使用第一张图原始尺寸</button>
          </div>

          <div class="it-section-label">输出格式</div>
          <div class="it-grid">
            <div class="it-field">
              <label>格式</label>
              <select id="itFormat">
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp" selected>WebP</option>
              </select>
            </div>
            <div class="it-field">
              <label>质量 (1–100)</label>
              <input type="number" id="itQuality" value="85" min="1" max="100">
            </div>
            <div class="it-field">
              <label>平滑质量</label>
              <select id="itSmoothing">
                <option value="high" selected>high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>
          </div>

          <div class="it-section-label">旋转与翻转</div>
          <div class="it-grid">
            <div class="it-field">
              <label>旋转</label>
              <select id="itRotate">
                <option value="0" selected>不旋转</option>
                <option value="90">顺时针 90°</option>
                <option value="180">180°</option>
                <option value="270">顺时针 270°</option>
              </select>
            </div>
            <div class="it-field">
              <label>翻转</label>
              <select id="itFlip">
                <option value="none" selected>不翻转</option>
                <option value="horizontal">水平翻转</option>
                <option value="vertical">垂直翻转</option>
              </select>
            </div>
          </div>

          <div class="it-section-label">圆角（Canvas 裁剪）</div>
          <div class="it-grid">
            <div class="it-field">
              <label>圆角模式</label>
              <select id="itCornerMode">
                <option value="none" selected>无圆角</option>
                <option value="custom">自定义半径</option>
                <option value="circle">圆形</option>
              </select>
            </div>
            <div class="it-field hidden" id="itFieldCornerRadius">
              <label>半径 (px)</label>
              <input type="number" id="itCornerRadius" value="24" min="0">
              <div class="it-hint">超过短边一半时自动取短边一半</div>
            </div>
          </div>
          <div class="it-jpeg-hint" id="itCornerJpegHint">⚠ JPEG 不支持透明，圆角外将填充白色；需要透明圆角请选 PNG 或 WebP</div>

          <div class="it-section-label">文字水印（可选）</div>
          <div class="it-grid">
            <div class="it-field">
              <label>水印文字</label>
              <input type="text" id="itWatermarkText" placeholder="留空则不添加">
            </div>
            <div class="it-field">
              <label>字号</label>
              <input type="number" id="itWatermarkSize" value="24" min="8" max="200">
            </div>
            <div class="it-field">
              <label>透明度</label>
              <input type="range" id="itWatermarkOpacity" min="0.1" max="1" step="0.05" value="0.5">
              <div class="it-hint" id="itOpacityLabel">50%</div>
            </div>
            <div class="it-field">
              <label>位置</label>
              <select id="itWatermarkPos">
                <option value="center" selected>居中</option>
                <option value="bottom-right">右下角</option>
                <option value="top-left">左上角</option>
              </select>
            </div>
          </div>

          <div class="it-actions">
            <button type="button" class="btn btn-primary" id="itProcessBtn">⚡ 开始处理</button>
            <button type="button" class="btn btn-danger" id="itCancelBtn" disabled>✕ 取消</button>
            <button type="button" class="btn btn-ok" id="itDownloadZipBtn" style="display:none">📦 打包下载 ZIP</button>
            <button type="button" class="btn" id="itResetBtn">↺ 重置</button>
          </div>
          <div class="it-status" id="itStatus"></div>
        </div>

        <div class="it-result-area" id="itResultArea">
          <div class="it-result-toolbar">
            <div class="it-count" id="itResultCount"></div>
          </div>
          <div class="it-result-grid" id="itResultGrid"></div>
        </div>

      </div>
    </div>`,

  mount(root, ctx) {
    const $ = id => root.querySelector('#' + id);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const dropZone = $('itDropZone'), fileInput = $('itFileInput');
    const fileListEl = $('itFileList'), panel = $('itPanel');
    const itFeatures = $('itFeatures');
    const processBtn = $('itProcessBtn'), cancelBtn = $('itCancelBtn');
    const downloadZipBtn = $('itDownloadZipBtn'), resetBtn = $('itResetBtn');
    const statusEl = $('itStatus'), resultArea = $('itResultArea');
    const resultGrid = $('itResultGrid'), resultCount = $('itResultCount');

    const sizeStrategy = $('itSizeStrategy');
    const fieldWidth = $('itFieldWidth'), fieldHeight = $('itFieldHeight');
    const fieldPercent = $('itFieldPercent'), fieldLongest = $('itFieldLongest');
    const widthInput = $('itWidth'), heightInput = $('itHeight');
    const percentInput = $('itPercentInput'), longestInput = $('itLongestInput');
    const lockRatio = $('itLockRatio'), useOriginalBtn = $('itUseOriginalBtn');

    const formatSelect = $('itFormat'), qualityInput = $('itQuality');
    const smoothingSelect = $('itSmoothing');
    const rotateSelect = $('itRotate'), flipSelect = $('itFlip');

    const cornerMode = $('itCornerMode'), cornerRadius = $('itCornerRadius');
    const fieldCornerRadius = $('itFieldCornerRadius'), cornerJpegHint = $('itCornerJpegHint');

    const watermarkText = $('itWatermarkText'), watermarkSize = $('itWatermarkSize');
    const watermarkOpacity = $('itWatermarkOpacity'), opacityLabel = $('itOpacityLabel');
    const watermarkPos = $('itWatermarkPos');

    let files = [];
    let results = [];
    let abortController = null;
    let objectUrls = [];

    function setStatus(msg, type) {
      statusEl.textContent = msg;
      statusEl.className = 'it-status' + (type ? ' ' + type : '');
    }
    function revokeAll() {
      objectUrls.forEach(u => URL.revokeObjectURL(u));
      objectUrls = [];
    }
    function formatBytes(b) {
      if (b < 1024) return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(2) + ' MB';
    }
    function uid() { return Math.random().toString(36).slice(2, 10); }
    function outputExt(mime) { return mime.split('/')[1].replace('jpeg', 'jpg'); }
    function getMime() {
      return formatSelect.value === 'jpg' ? 'image/jpeg' : 'image/' + formatSelect.value;
    }

    function blobToImage(blob) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片解码失败')); };
        img.src = url;
      });
    }
    function readImageSize(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读取尺寸失败')); };
        img.src = url;
      });
    }
    function canvasToBlob(canvas) {
      const mime = getMime();
      const quality = (parseInt(qualityInput.value, 10) || 85) / 100;
      return new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas 导出失败')), mime, quality);
      });
    }
    function roundRectPath(c2d, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      c2d.beginPath();
      c2d.moveTo(x + r, y);
      c2d.arcTo(x + w, y, x + w, y + h, r);
      c2d.arcTo(x + w, y + h, x, y + h, r);
      c2d.arcTo(x, y + h, x, y, r);
      c2d.arcTo(x, y, x + w, y, r);
      c2d.closePath();
    }
    function abortError() { return new DOMException('Aborted', 'AbortError'); }

    /* ---------- 文件管理 ---------- */
    async function addFiles(newFiles) {
      for (const f of newFiles) {
        if (!f.type.startsWith('image/')) continue;
        if (files.some(x => x.file.name === f.name && x.file.size === f.size)) continue;
        let dim = { w: 0, h: 0 };
        try { dim = await readImageSize(f); } catch (_) {}
        files.push({ file: f, id: uid(), width: dim.w, height: dim.h });
      }
      renderFileList();
      syncPanel();
    }
    function renderFileList() {
      fileListEl.innerHTML = '';
      if (!files.length) { fileListEl.style.display = 'none'; return; }
      fileListEl.style.display = '';
      files.forEach(item => {
        const row = document.createElement('div');
        row.className = 'it-fileitem';
        const dim = item.width ? item.width + '×' + item.height + ' · ' : '';
        row.innerHTML =
          '<span class="it-name" title="' + item.file.name + '">' + item.file.name + '</span>' +
          '<span class="it-meta">' + dim + formatBytes(item.file.size) + '</span>' +
          '<button type="button" class="it-remove" data-id="' + item.id + '" title="移除">✕</button>';
        fileListEl.appendChild(row);
      });
    }
    ctx.on(fileListEl, 'click', e => {
      const btn = e.target.closest('.it-remove');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      files = files.filter(x => x.id !== id);
      renderFileList();
      syncPanel();
    });

    function syncPanel() {
      const hasFiles = files.length > 0;
      if (itFeatures) itFeatures.style.display = hasFiles ? 'none' : 'grid';
      panel.style.display = hasFiles ? '' : 'none';
      resultArea.classList.toggle('show', results.length > 0);
    }

    /* ---------- 尺寸策略 ---------- */
    function syncSizeFields() {
      const s = sizeStrategy.value;
      fieldWidth.classList.toggle('hidden', !(s === 'fixed' || s === 'fit-width'));
      fieldHeight.classList.toggle('hidden', !(s === 'fixed' || s === 'fit-height'));
      fieldPercent.classList.toggle('hidden', s !== 'percent');
      fieldLongest.classList.toggle('hidden', s !== 'longest-side');
      lockRatio.parentElement.style.opacity = s === 'fixed' ? '1' : '0.4';
      lockRatio.disabled = s !== 'fixed';
    }
    function syncCornerFields() {
      fieldCornerRadius.classList.toggle('hidden', cornerMode.value !== 'custom');
      const showJpegHint = getMime() === 'image/jpeg' && cornerMode.value !== 'none';
      cornerJpegHint.style.display = showJpegHint ? 'block' : 'none';
    }
    function firstRatio() {
      if (files.length && files[0].width && files[0].height) {
        return files[0].width / files[0].height;
      }
      return 1;
    }
    let syncing = false;
    ctx.on(widthInput, 'input', () => {
      if (syncing || !lockRatio.checked || sizeStrategy.value !== 'fixed') return;
      syncing = true;
      const w = parseFloat(widthInput.value);
      if (w > 0) heightInput.value = Math.max(1, Math.round(w / firstRatio()));
      syncing = false;
    });
    ctx.on(heightInput, 'input', () => {
      if (syncing || !lockRatio.checked || sizeStrategy.value !== 'fixed') return;
      syncing = true;
      const h = parseFloat(heightInput.value);
      if (h > 0) widthInput.value = Math.max(1, Math.round(h * firstRatio()));
      syncing = false;
    });

    function computeTargetSize(imgW, imgH) {
      const strategy = sizeStrategy.value;
      if (strategy === 'percent') {
        const p = (parseFloat(percentInput.value) || 100) / 100;
        return { w: Math.max(1, Math.round(imgW * p)), h: Math.max(1, Math.round(imgH * p)) };
      }
      if (strategy === 'fit-width') {
        const w = Math.max(1, parseInt(widthInput.value, 10) || imgW);
        return { w, h: Math.max(1, Math.round(w * imgH / imgW)) };
      }
      if (strategy === 'fit-height') {
        const h = Math.max(1, parseInt(heightInput.value, 10) || imgH);
        return { w: Math.max(1, Math.round(h * imgW / imgH)), h };
      }
      if (strategy === 'longest-side') {
        const max = Math.max(1, parseInt(longestInput.value, 10) || 1200);
        const ratio = Math.min(max / imgW, max / imgH, 1);
        return { w: Math.max(1, Math.round(imgW * ratio)), h: Math.max(1, Math.round(imgH * ratio)) };
      }
      return {
        w: Math.max(1, parseInt(widthInput.value, 10) || 800),
        h: Math.max(1, parseInt(heightInput.value, 10) || 800)
      };
    }

    /* ---------- 核心处理：Canvas 原生实现（替代 ImageTune 库） ---------- */
    async function tuneFile(item, signal) {
      const size = computeTargetSize(item.width, item.height);
      const useCrop = sizeStrategy.value === 'fixed';
      const mime = getMime();
      const quality = Math.min(1, Math.max(0.01, (parseInt(qualityInput.value, 10) || 85) / 100));
      const smooth = smoothingSelect.value;

      if (signal && signal.aborted) throw abortError();
      const img = await blobToImage(item.file);
      if (signal && signal.aborted) throw abortError();

      const canvas = document.createElement('canvas');
      canvas.width = size.w;
      canvas.height = size.h;
      const c2d = canvas.getContext('2d');
      c2d.imageSmoothingEnabled = true;
      c2d.imageSmoothingQuality = smooth;

      if (useCrop) {
        const sw = img.naturalWidth, sh = img.naturalHeight;
        const scale = Math.max(size.w / sw, size.h / sh);
        const dw = sw * scale, dh = sh * scale;
        c2d.drawImage(img, (size.w - dw) / 2, (size.h - dh) / 2, dw, dh);
      } else {
        c2d.drawImage(img, 0, 0, size.w, size.h);
      }

      return new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas 导出失败')), mime, quality);
      });
    }

    async function postProcess(blob) {
      const rot = parseInt(rotateSelect.value, 10) || 0;
      const flip = flipSelect.value;
      const wmText = watermarkText.value.trim();
      const cMode = cornerMode.value;
      const radiusInput = Math.max(0, parseInt(cornerRadius.value, 10) || 0);
      const hasPost = rot !== 0 || flip !== 'none' || wmText || cMode !== 'none';
      if (!hasPost) return blob;

      const img = await blobToImage(blob);
      const angle = rot * Math.PI / 180;
      const swap = rot === 90 || rot === 270;
      const cw = swap ? img.naturalHeight : img.naturalWidth;
      const ch = swap ? img.naturalWidth : img.naturalHeight;

      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const c2d = canvas.getContext('2d');
      const isJpeg = getMime() === 'image/jpeg';

      if (isJpeg) {
        c2d.fillStyle = '#ffffff';
        c2d.fillRect(0, 0, cw, ch);
      }

      let clipped = false;
      if (cMode === 'circle') {
        const r = Math.min(cw, ch) / 2;
        c2d.save();
        c2d.beginPath();
        c2d.ellipse(cw / 2, ch / 2, r, r, 0, 0, Math.PI * 2);
        c2d.closePath();
        c2d.clip();
        clipped = true;
      } else if (cMode === 'custom' && radiusInput > 0) {
        c2d.save();
        roundRectPath(c2d, 0, 0, cw, ch, radiusInput);
        c2d.clip();
        clipped = true;
      }

      c2d.save();
      c2d.translate(cw / 2, ch / 2);
      c2d.rotate(angle);
      c2d.scale(flip === 'horizontal' ? -1 : 1, flip === 'vertical' ? -1 : 1);
      if (swap) c2d.drawImage(img, -img.naturalHeight / 2, -img.naturalWidth / 2);
      else c2d.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      c2d.restore();

      if (wmText) {
        const size = Math.max(8, parseInt(watermarkSize.value, 10) || 24);
        const opacity = Math.min(1, Math.max(0.1, parseFloat(watermarkOpacity.value) || 0.5));
        c2d.font = 'bold ' + size + 'px -apple-system, sans-serif';
        c2d.fillStyle = 'rgba(255,255,255,' + opacity + ')';
        c2d.textBaseline = 'middle';
        c2d.shadowColor = 'rgba(0,0,0,0.3)';
        c2d.shadowBlur = 4;
        const pos = watermarkPos.value;
        if (pos === 'center') { c2d.textAlign = 'center'; c2d.fillText(wmText, cw / 2, ch / 2); }
        else if (pos === 'bottom-right') { c2d.textAlign = 'right'; c2d.fillText(wmText, cw - 16, ch - 16); }
        else { c2d.textAlign = 'left'; c2d.fillText(wmText, 16, 16); }
      }

      if (clipped) c2d.restore();
      return canvasToBlob(canvas);
    }

    /* ---------- 批量处理 ---------- */
    async function processAll() {
      if (!files.length) return;
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      processBtn.disabled = true;
      cancelBtn.disabled = false;
      downloadZipBtn.style.display = 'none';
      resultArea.classList.remove('show');
      resultGrid.innerHTML = '';
      results = [];
      revokeAll();

      let done = 0;
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        if (signal.aborted) break;
        const item = files[i];
        setStatus('处理中 (' + (i + 1) + '/' + total + ')：' + item.file.name, 'info');
        try {
          let blob = await tuneFile(item, signal);
          if (signal.aborted) break;
          blob = await postProcess(blob);
          if (signal.aborted) break;

          const outImg = await blobToImage(blob);
          const outW = outImg.naturalWidth, outH = outImg.naturalHeight;

          const url = URL.createObjectURL(blob);
          objectUrls.push(url);
          results.push({
            id: item.id, blob, url,
            name: item.file.name.replace(/\.[^.]+$/, ''),
            size: blob.size, type: blob.type,
            outW, outH
          });
          done++;
        } catch (err) {
          if (err && err.name === 'AbortError') { setStatus('⏹ 已取消', 'info'); break; }
          console.error(err);
          setStatus('「' + item.file.name + '」失败：' + (err.message || '未知错误'), 'error');
        }
      }

      if (!signal.aborted && done > 0) {
        setStatus('✅ 完成 ' + done + ' / ' + total + ' 张', 'success');
        renderResults();
      }
      processBtn.disabled = false;
      cancelBtn.disabled = true;
      abortController = null;
    }

    function renderResults() {
      if (!results.length) return;
      resultArea.classList.add('show');
      resultCount.textContent = '处理结果 · ' + results.length + ' 张';
      resultGrid.innerHTML = '';
      results.forEach(r => {
        const ext = outputExt(r.type);
        const card = document.createElement('div');
        card.className = 'it-result-card';
        card.innerHTML =
          '<img class="it-thumb" src="' + r.url + '" alt="' + r.name + '">' +
          '<div class="it-info"><strong title="' + r.name + '">' + r.name + '</strong>' +
          '<span class="it-dim">' + r.outW + '×' + r.outH + '</span> · ' +
          formatBytes(r.size) + ' · ' + r.type + '</div>' +
          '<a class="it-download" href="' + r.url + '" download="' + r.name + '_tuned.' + ext + '">⬇ 下载</a>';
        resultGrid.appendChild(card);
      });
      downloadZipBtn.style.display = results.length > 1 ? '' : 'none';
    }

    /* ---------- 使用 fflate 打包下载 ---------- */
    async function downloadAllAsZip() {
      if (!results.length) return;
      const fl = window.fflate;
      if (!fl) { setStatus('⚠ fflate 库未加载，无法打包', 'error'); return; }

      downloadZipBtn.disabled = true;
      setStatus('正在打包…', 'info');
      try {
        const zipData = {};
        for (const r of results) {
          const buf = new Uint8Array(await r.blob.arrayBuffer());
          zipData[r.name + '_tuned.' + outputExt(r.type)] = buf;
        }
        const zipped = fl.zipSync(zipData, { level: 6 });
        const blob = new Blob([zipped], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'imagetune_' + Date.now() + '.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('✅ 打包完成，共 ' + results.length + ' 张', 'success');
      } catch (e) {
        setStatus('打包失败：' + e.message, 'error');
      } finally {
        downloadZipBtn.disabled = false;
      }
    }

    function cancelProcess() {
      if (abortController) { abortController.abort(); abortController = null; }
      processBtn.disabled = false;
      cancelBtn.disabled = true;
    }

    function resetAll() {
      cancelProcess();
      revokeAll();
      files = []; results = [];
      renderFileList(); syncPanel();
      resultArea.classList.remove('show');
      resultGrid.innerHTML = ''; resultCount.textContent = '';
      downloadZipBtn.style.display = 'none';
      setStatus('');
      fileInput.value = '';
      sizeStrategy.value = 'fixed';
      widthInput.value = 800; heightInput.value = 800;
      percentInput.value = 50; longestInput.value = 1200;
      lockRatio.checked = false;
      formatSelect.value = 'webp'; qualityInput.value = 85;
      smoothingSelect.value = 'high';
      rotateSelect.value = '0'; flipSelect.value = 'none';
      cornerMode.value = 'none'; cornerRadius.value = 24;
      watermarkText.value = ''; watermarkSize.value = 24;
      watermarkOpacity.value = 0.5; opacityLabel.textContent = '50%';
      watermarkPos.value = 'center';
      syncSizeFields(); syncCornerFields();
    }

    /* ---------- 预设 ---------- */
    const presets = {
      avatar:       { strategy: 'fixed', w: 200,  h: 200 },
      avatarCircle: { strategy: 'fixed', w: 200,  h: 200, corner: 'circle' },
      thumb:        { strategy: 'fixed', w: 400,  h: 400 },
      social:       { strategy: 'fixed', w: 1200, h: 630 },
      story:        { strategy: 'fixed', w: 1080, h: 1920 },
      half:         { strategy: 'percent', pct: 50 },
      longest:      { strategy: 'longest-side', max: 1200 },
      original:     { strategy: 'fixed', original: true }
    };
    ctx.on(root.querySelector('.it-presets'), 'click', async e => {
      const btn = e.target.closest('.it-preset-btn');
      if (!btn) return;
      const p = presets[btn.getAttribute('data-preset')];
      if (!p) return;
      sizeStrategy.value = p.strategy;
      syncSizeFields();
      if (p.strategy === 'fixed') {
        if (p.original) {
          if (files.length && files[0].width) {
            widthInput.value = files[0].width;
            heightInput.value = files[0].height;
          } else if (files.length) {
            try {
              const dim = await readImageSize(files[0].file);
              widthInput.value = dim.w; heightInput.value = dim.h;
            } catch (_) {}
          }
        } else {
          widthInput.value = p.w; heightInput.value = p.h;
        }
      } else if (p.strategy === 'percent') {
        percentInput.value = p.pct;
      } else if (p.strategy === 'longest-side') {
        longestInput.value = p.max;
      }
      if (p.corner) {
        cornerMode.value = p.corner;
        syncCornerFields();
      }
    });

    /* ---------- 事件绑定 ---------- */
    ctx.on(sizeStrategy, 'change', syncSizeFields);
    ctx.on(cornerMode, 'change', syncCornerFields);
    ctx.on(formatSelect, 'change', syncCornerFields);

    ctx.on(useOriginalBtn, 'click', async () => {
      sizeStrategy.value = 'fixed';
      syncSizeFields();
      if (files.length) {
        if (files[0].width) {
          widthInput.value = files[0].width;
          heightInput.value = files[0].height;
        } else {
          try {
            const dim = await readImageSize(files[0].file);
            widthInput.value = dim.w; heightInput.value = dim.h;
          } catch (_) { setStatus('读取原始尺寸失败', 'error'); }
        }
      }
    });

    ctx.on(dropZone, 'click', () => fileInput.click());
    ctx.on(fileInput, 'change', () => {
      if (fileInput.files) addFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });
    ctx.on(dropZone, 'dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    ctx.on(dropZone, 'dragleave', () => dropZone.classList.remove('dragover'));
    ctx.on(dropZone, 'drop', e => {
      e.preventDefault(); dropZone.classList.remove('dragover');
      if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
    });

    ctx.on(processBtn, 'click', processAll);
    ctx.on(cancelBtn, 'click', cancelProcess);
    ctx.on(resetBtn, 'click', resetAll);
    ctx.on(downloadZipBtn, 'click', downloadAllAsZip);
    ctx.on(watermarkOpacity, 'input', function() {
      opacityLabel.textContent = Math.round(parseFloat(this.value) * 100) + '%';
    });
    ctx.on(window, 'beforeunload', revokeAll);

    /* ---------- 初始化 ---------- */
    syncSizeFields();
    syncCornerFields();
    syncPanel();
    if (!window.fflate) {
      setStatus('⚠ fflate 未加载，打包下载不可用（其他功能正常）', 'error');
    }
  }
});
})(window);
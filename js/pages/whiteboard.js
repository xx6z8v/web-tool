(function(global){
'use strict';
const App = global.App;

App.registerPage('whiteboard', {
  title: '云画板',

  template: () => `
    <div class="page page-whiteboard">
      <div class="toolbar">
        <button class="tool active" data-tool="pen"><span>✏️</span><span class="btn-text">画笔</span></button>
        <button class="tool" data-tool="eraser"><span>🧽</span><span class="btn-text">橡皮</span></button>
        <button class="tool" data-tool="text"><span>T</span><span class="btn-text">文字</span></button>
        <span class="divider"></span>
        <input type="color" id="colorPicker" value="#1f2937" title="选择颜色">
        <span class="size-wrap">
          <input type="range" id="sizeRange" min="1" max="48" value="6" title="笔刷大小">
          <span class="size-label" id="sizeLabel">6</span>
        </span>
        <span class="divider"></span>
        <button id="undoBtn" disabled><span>↶</span><span class="btn-text">撤销</span></button>
        <button id="redoBtn" disabled><span>↷</span><span class="btn-text">重做</span></button>
        <button id="clearBtn"><span>🗑️</span><span class="btn-text">清空</span></button>
        <button id="saveBtn"><span>⬇️</span><span class="btn-text">保存</span></button>
        <span class="divider"></span>
        <button id="bgBtn"><span>🖼️</span><span class="btn-text">背景</span></button>

        <!-- 背景面板 -->
        <div class="bg-panel" id="bgPanel">
          <h4>设置背景（仅作用于当前画布）</h4>
          <div class="bg-row">
            <input type="text" id="bgUrl" placeholder="粘贴图片 URL…" autocomplete="off" spellcheck="false">
            <button id="bgApply" class="primary">应用</button>
          </div>
          <div class="bg-row">
            <button id="bgUpload">📁 上传本地图片</button>
            <input type="file" id="bgFile" accept="image/*" hidden>
            <select id="bgFit" title="填充方式">
              <option value="contain">适应</option>
              <option value="cover">铺满</option>
              <option value="100% 100%">拉伸</option>
            </select>
          </div>
          <div class="bg-row">
            <button id="bgRemove" disabled>✖ 移除背景</button>
          </div>
          <div class="bg-hint" id="bgHint"></div>
        </div>
      </div>

      <div class="board-bar">
        <div class="board-tabs" id="boardTabs"></div>
        <button class="add-board" id="addBoardBtn">+ 新建画布</button>
      </div>

      <div class="wrap" id="wrap">
        <canvas id="board"></canvas>
        <div class="drop-overlay" id="dropOverlay">
          <div class="drop-hint">松开鼠标，将图片设为当前画布的背景</div>
        </div>
      </div>
    </div>`,

  mount(root, ctx){
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));

    const wrap = $('#wrap');
    const canvas = $('#board');
    const ctx2d = canvas.getContext('2d');
    const colorPicker = $('#colorPicker');
    const sizeRange = $('#sizeRange');
    const sizeLabel = $('#sizeLabel');
    const undoBtn = $('#undoBtn');
    const redoBtn = $('#redoBtn');
    const bgPanel = $('#bgPanel');
    const bgUrl = $('#bgUrl');
    const bgFit = $('#bgFit');
    const bgRemove = $('#bgRemove');
    const bgHint = $('#bgHint');
    const boardTabs = $('#boardTabs');
    const dropOverlay = $('#dropOverlay');

    const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    const MAX_HISTORY = 30;
    const LINE_HEIGHT = 1.25;

    const COLOR_LIGHT = '#1f2937'; // 白底黑笔
    const COLOR_DARK = '#e5e7eb';  // 黑底白笔

    let dpr = 1;
    let tool = 'pen';
    let color = colorPicker.value;
    let brushSize = Number(sizeRange.value);
    let activeInput = null;

    let drawing = false;
    let lastX = 0, lastY = 0;
    let pendingPoints = [];
    let rafId = null;

    let boards = [];
    let activeId = null;
    let boardSeq = 0;

    let loadToken = 0, bgToken = 0;
    let resizeRaf = null, dragDepth = 0;
    const measureCtx = document.createElement('canvas').getContext('2d');

    // ---------------- 终极杀招：智能探测实际背景色 ----------------
    // 用来对付 Dark Reader 等外部插件强制反转背景色的问题
    function getIsDarkBackground() {
      // 获取画板容器实际计算出来的背景色（比如被 Dark Reader 变成了深色）
      const bgColor = window.getComputedStyle(wrap).backgroundColor;
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        // 人眼感知亮度公式
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5; // 小于 0.5 认为是暗色背景
      }
      // 兜底：如果解析失败，则用自带主题判断
      return document.documentElement.dataset.theme === 'dark';
    }

    // 动态同步画笔颜色
    function checkAndUpdatePenColor() {
      const isDark = getIsDarkBackground();
      const cur = colorPicker.value.toLowerCase();

      if (isDark && cur === COLOR_LIGHT) {
        color = COLOR_DARK;
        colorPicker.value = COLOR_DARK;
      } 
      else if (!isDark && cur === COLOR_DARK) {
        color = COLOR_LIGHT;
        colorPicker.value = COLOR_LIGHT;
      }
    }
    // -----------------------------------------------------------

    // 1. 基础工具
    function getActive(){ return boards.find(b => b.id === activeId); }
    function currentColor(){ return color; }
    function currentWidth(){ return tool === 'eraser' ? brushSize * 2.5 : brushSize; }
    function getPos(e){ const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function measureText(text, fs){ measureCtx.font = fs + 'px ' + FONT_FAMILY; return measureCtx.measureText(text).width; }

    // 2. 尺寸与渲染
    function clearMainCanvas(){ ctx2d.save(); ctx2d.setTransform(1,0,0,1,0,0); ctx2d.clearRect(0,0,canvas.width,canvas.height); ctx2d.restore(); }
    function ensureBoardCanvasSize(board, w, h){
      if(board.canvas.width === w && board.canvas.height === h) return;
      const nc = document.createElement('canvas'); nc.width = w; nc.height = h;
      if(board.canvas.width > 0) nc.getContext('2d').drawImage(board.canvas, 0, 0);
      board.canvas = nc;
    }
    function syncActiveToBoard(){
      const b = getActive(); if(!b || !canvas.width) return;
      ensureBoardCanvasSize(b, canvas.width, canvas.height);
      const c = b.canvas.getContext('2d');
      c.clearRect(0, 0, b.canvas.width, b.canvas.height);
      c.drawImage(canvas, 0, 0);
    }
    function applyBgCss(b){
      if(!b || !b.bg){ canvas.style.backgroundImage = 'none'; return; }
      const safe = String(b.bg.src).replace(/"/g, '\\"');
      canvas.style.backgroundImage = 'url("' + safe + '")';
      canvas.style.backgroundSize = b.bg.fit;
      canvas.style.backgroundPosition = 'center';
      canvas.style.backgroundRepeat = 'no-repeat';
    }
    function reloadActiveBoard(){
      clearMainCanvas();
      const b = getActive();
      if(b && b.canvas.width > 0){ ctx2d.save(); ctx2d.setTransform(1,0,0,1,0,0); ctx2d.drawImage(b.canvas, 0, 0); ctx2d.restore(); }
      applyBgCss(b);
    }
    function resizeCanvas(){
      const rect = wrap.getBoundingClientRect();
      const cssW = Math.max(1, Math.round(rect.width)), cssH = Math.max(1, Math.round(rect.height));
      const newDpr = Math.max(1, window.devicePixelRatio || 1);
      const pw = Math.round(cssW * newDpr), ph = Math.round(cssH * newDpr);
      if(canvas.width === pw && canvas.height === ph && dpr === newDpr) return;
      
      syncActiveToBoard();
      dpr = newDpr; canvas.width = pw; canvas.height = ph;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      boards.forEach(b => ensureBoardCanvasSize(b, pw, ph));
      reloadActiveBoard();
    }
    function scheduleResize(){
      if(resizeRaf) return;
      resizeRaf = ctx.raf(() => { resizeRaf = null; resizeCanvas(); });
    }

    // 3. 画布管理
    function createBoard(name){
      boardSeq++;
      const b = { id: 'b' + boardSeq, name: name || ('画布 ' + boardSeq), canvas: document.createElement('canvas'), bg: null, history: [], hIndex: -1 };
      if(canvas.width > 0){ b.canvas.width = canvas.width; b.canvas.height = canvas.height; }
      return b;
    }
    function renderTabs(){
      boardTabs.innerHTML = '';
      boards.forEach(b => {
        const tab = document.createElement('div');
        tab.className = 'tab' + (b.id === activeId ? ' active' : '');
        tab.title = '点击切换，双击重命名';
        const nameEl = document.createElement('span'); nameEl.className = 'tab-name'; nameEl.textContent = b.name; tab.appendChild(nameEl);
        if(boards.length > 1){
          const close = document.createElement('span'); close.className = 'close'; close.textContent = '×'; close.title = '删除该画布';
          ctx.on(close, 'click', e => { e.stopPropagation(); deleteBoard(b.id); });
          tab.appendChild(close);
        }
        ctx.on(tab, 'click', () => switchBoard(b.id));
        ctx.on(tab, 'dblclick', e => {
          e.stopPropagation();
          const name = prompt('重命名画布', b.name);
          if(name && name.trim()){ b.name = name.trim().slice(0, 24); renderTabs(); }
        });
        boardTabs.appendChild(tab);
      });
    }
    function switchBoard(id){
      if(id === activeId) return;
      commitText(); syncActiveToBoard();
      activeId = id; reloadActiveBoard(); renderTabs(); updateHistoryButtons(); updateBgUI();
    }
    function addBoard(){
      commitText(); syncActiveToBoard();
      const b = createBoard(); boards.push(b); activeId = null; switchBoard(b.id);
    }
    function deleteBoard(id){
      if(boards.length <= 1) return;
      const idx = boards.findIndex(b => b.id === id); if(idx < 0) return;
      commitText(); const wasActive = (activeId === id);
      if(wasActive) syncActiveToBoard();
      boards.splice(idx, 1);
      if(wasActive){ const next = boards[Math.min(idx, boards.length - 1)]; activeId = null; switchBoard(next.id); }
      else renderTabs();
    }

    // 4. 历史记录
    function snapshot(){ try { return canvas.toDataURL('image/png'); } catch(e){ return null; } }
    function pushHistory(){
      const b = getActive(); if(!b) return;
      const data = snapshot(); if(!data) return;
      b.history = b.history.slice(0, b.hIndex + 1); b.history.push(data);
      if(b.history.length > MAX_HISTORY) b.history.shift();
      b.hIndex = b.history.length - 1; updateHistoryButtons();
    }
    function updateHistoryButtons(){
      const b = getActive();
      undoBtn.disabled = !b || b.hIndex < 0;
      redoBtn.disabled = !b || b.hIndex >= b.history.length - 1;
    }
    function loadHistoryState(board){
      const token = ++loadToken;
      if(board.hIndex < 0){ if(getActive() === board) clearMainCanvas(); updateHistoryButtons(); return; }
      const data = board.history[board.hIndex]; if(!data) return;
      const img = new Image();
      img.onload = () => {
        if(token !== loadToken || getActive() !== board) return;
        ctx2d.save(); ctx2d.setTransform(1,0,0,1,0,0);
        ctx2d.clearRect(0,0,canvas.width,canvas.height); ctx2d.drawImage(img,0,0); ctx2d.restore();
      };
      img.src = data; updateHistoryButtons();
    }
    function undo(){ const b = getActive(); if(!b || b.hIndex < 0) return; commitText(); b.hIndex--; loadHistoryState(b); }
    function redo(){ const b = getActive(); if(!b || b.hIndex >= b.history.length - 1) return; commitText(); b.hIndex++; loadHistoryState(b); }

    // 5. 绘制
    function onPointerDown(e){
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      if(activeInput){ commitText(); return; }
      if(tool === 'text'){ openTextInput(e); return; }
      
      // 每次落笔前，智能检查一次背景色，如果被插件强制反转了，自动匹配对应画笔
      checkAndUpdatePenColor(); 

      e.preventDefault();
      const p = getPos(e);
      drawing = true; lastX = p.x; lastY = p.y; pendingPoints = [];
      try { canvas.setPointerCapture(e.pointerId); } catch(_){}
      ctx2d.save();
      ctx2d.globalCompositeOperation = (tool === 'eraser') ? 'destination-out' : 'source-over';
      ctx2d.beginPath(); ctx2d.arc(p.x, p.y, currentWidth()/2, 0, Math.PI*2);
      ctx2d.fillStyle = currentColor(); ctx2d.fill(); ctx2d.restore();
    }
    function onPointerMove(e){
      if(!drawing) return;
      e.preventDefault();
      const evts = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : [e];
      for(let i = 0; i < evts.length; i++) pendingPoints.push(getPos(evts[i]));
      if(!rafId) rafId = ctx.raf(flushPoints);
    }
    function flushPoints(){
      rafId = null; if(!drawing || !pendingPoints.length) return;
      const pts = pendingPoints; pendingPoints = [];
      ctx2d.save();
      ctx2d.globalCompositeOperation = (tool === 'eraser') ? 'destination-out' : 'source-over';
      ctx2d.strokeStyle = currentColor(); ctx2d.lineWidth = currentWidth();
      ctx2d.lineCap = 'round'; ctx2d.lineJoin = 'round';
      ctx2d.beginPath(); ctx2d.moveTo(lastX, lastY);
      if(pts.length === 1) ctx2d.lineTo(pts[0].x, pts[0].y);
      else {
        for(let i = 0; i < pts.length - 1; i++){
          const mx = (pts[i].x + pts[i+1].x) / 2, my = (pts[i].y + pts[i+1].y) / 2;
          ctx2d.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        }
        const last = pts[pts.length - 1]; ctx2d.lineTo(last.x, last.y);
      }
      ctx2d.stroke(); ctx2d.restore();
      const tail = pts[pts.length - 1]; lastX = tail.x; lastY = tail.y;
    }
    function endStroke(e){
      if(!drawing) return;
      if(rafId){ ctx.cancelRaf(rafId); rafId = null; }
      flushPoints(); drawing = false; pendingPoints = [];
      try { canvas.releasePointerCapture(e.pointerId); } catch(_){}
      pushHistory();
    }

    // 6. 文字输入
    function autoResizeTextarea(ta, fs){
      ta.style.height = 'auto';
      ta.style.height = Math.max(fs * LINE_HEIGHT, ta.scrollHeight) + 'px';
      const lines = ta.value.split('\n'); let maxW = 0;
      for(let i = 0; i < lines.length; i++) maxW = Math.max(maxW, measureText(lines[i] || ' ', fs));
      ta.style.width = Math.max(90, Math.ceil(maxW) + 20) + 'px';
    }
    function openTextInput(e){
      commitText();
      checkAndUpdatePenColor(); // 输入文字前也检查一次
      const p = getPos(e), fs = Math.max(16, Math.round(brushSize * 3));
      const input = document.createElement('textarea');
      input.rows = 1; input.className = 'canvas-text-input';
      input.style.left = p.x + 'px'; input.style.top = p.y + 'px';
      input.style.fontSize = fs + 'px'; input.style.fontFamily = FONT_FAMILY; input.style.color = color;
      input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false'); input.setAttribute('wrap', 'off');
      wrap.appendChild(input);
      activeInput = { el: input, x: p.x, y: p.y, fontSize: fs, color: color };
      autoResizeTextarea(input, fs);
      ctx.on(input, 'input', () => autoResizeTextarea(input, fs));
      ctx.on(input, 'keydown', ev => {
        ev.stopPropagation();
        if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){ ev.preventDefault(); commitText(); }
        else if(ev.key === 'Escape'){ ev.preventDefault(); cancelText(); }
      });
      ctx.on(input, 'blur', () => commitText());
      ctx.setTimeout(() => { input.focus(); try{ input.setSelectionRange(input.value.length, input.value.length); }catch(_){ } }, 0);
    }
    function drawMultilineText(c2d, text, x, y, fs, color){
      const lines = text.split('\n'), lh = LINE_HEIGHT * fs;
      const drawY = y + (LINE_HEIGHT - 1) / 2 * fs;
      c2d.save(); c2d.fillStyle = color; c2d.font = fs + 'px ' + FONT_FAMILY;
      c2d.textBaseline = 'top'; c2d.textAlign = 'left';
      for(let i = 0; i < lines.length; i++) c2d.fillText(lines[i], x, drawY + i * lh);
      c2d.restore();
    }
    function commitText(){
      if(!activeInput) return;
      const cur = activeInput; activeInput = null;
      const text = cur.el.value; cur.el.remove();
      if(!text.trim()) return;
      drawMultilineText(ctx2d, text, cur.x, cur.y, cur.fontSize, cur.color);
      pushHistory();
    }
    function cancelText(){ if(!activeInput) return; const el = activeInput.el; activeInput = null; el.remove(); }

    // 7. 清空与保存
    function clearBoard(){ commitText(); clearMainCanvas(); pushHistory(); }
    function drawImageFit(c2d, img, w, h, fit){
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if(!iw || !ih) return;
      let dw, dh, dx, dy;
      if(fit === '100% 100%'){ dw = w; dh = h; dx = 0; dy = 0; }
      else if(fit === 'cover'){ const s = Math.max(w/iw, h/ih); dw = iw*s; dh = ih*s; dx = (w-dw)/2; dy = (h-dh)/2; }
      else { const s = Math.min(w/iw, h/ih); dw = iw*s; dh = ih*s; dx = (w-dw)/2; dy = (h-dh)/2; }
      c2d.drawImage(img, dx, dy, dw, dh);
    }
    function saveImage(){
      commitText();
      const b = getActive(), w = canvas.width, h = canvas.height;
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      
      // 导出时，同样智能判断当前显示的是黑底还是白底
      const isDark = getIsDarkBackground();
      tctx.fillStyle = isDark ? '#161b22' : '#ffffff'; 
      tctx.fillRect(0, 0, w, h);
      
      let bgSkipped = false;
      if(b && b.bg && b.bg.img){ if(b.bg.tainted) bgSkipped = true; else drawImageFit(tctx, b.bg.img, w, h, b.bg.fit); }
      tctx.drawImage(canvas, 0, 0);
      
      const now = new Date(), pad = n => String(n).padStart(2, '0');
      const stamp = now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
      try {
        const url = tmp.toDataURL('image/png');
        const a = document.createElement('a'); a.download = '画板_' + stamp + '.png'; a.href = url;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if(bgSkipped) ctx.toast('已导出（背景图跨域受限，未包含在图片中）', 'warn');
      } catch(err){ ctx.toast('导出失败：背景图可能受跨域限制', 'err'); }
    }

    // 8. 背景图
    function updateBgUI(){
      const b = getActive();
      if(!b || !b.bg){ bgUrl.value = ''; bgFit.value = 'contain'; bgHint.textContent = ''; bgRemove.disabled = true; return; }
      bgUrl.value = /^data:/i.test(b.bg.src) ? '' : b.bg.src;
      bgFit.value = b.bg.fit; bgRemove.disabled = false;
      bgHint.textContent = b.bg.tainted ? '⚠ 该图片服务器未开启跨域许可，导出 PNG 时将不包含此背景。' : '';
    }
    function setBoardBackground(src, fit){
      const b = getActive(); if(!b) return;
      if(!src){ ctx.toast('请输入图片地址', 'warn'); return; }
      const token = ++bgToken, isData = /^data:/i.test(src);
      function succeed(img, tainted){
        if(token !== bgToken) return;
        const current = getActive(); if(!current) return;
        current.bg = { img, src, fit: fit || (current.bg ? current.bg.fit : 'contain'), tainted };
        applyBgCss(current); updateBgUI();
        ctx.toast(tainted ? '背景已应用（导出时不含此背景）' : '背景已应用');
      }
      const img = new Image();
      if(!isData) img.crossOrigin = 'anonymous';
      img.onload = () => succeed(img, false);
      img.onerror = () => {
        if(token !== bgToken) return;
        if(isData){ ctx.toast('图片解析失败', 'err'); return; }
        const img2 = new Image();
        img2.onload = () => succeed(img2, true);
        img2.onerror = () => { if(token === bgToken) ctx.toast('图片加载失败，请检查地址', 'err'); };
        img2.src = src;
      };
      img.src = src;
    }
    function removeBoardBackground(){
      const b = getActive(); if(!b) return;
      b.bg = null; applyBgCss(b); updateBgUI(); ctx.toast('已移除背景');
    }

    // 9. 事件绑定
    ctx.on(canvas, 'pointerdown', onPointerDown);
    ctx.on(canvas, 'pointermove', onPointerMove);
    ctx.on(canvas, 'pointerup', endStroke);
    ctx.on(canvas, 'pointercancel', endStroke);
    ctx.onActive(window, 'pointerup', endStroke);
    ctx.onActive(window, 'blur', () => { if(drawing){ if(rafId){ ctx.cancelRaf(rafId); rafId = null; } flushPoints(); drawing = false; pendingPoints = []; pushHistory(); } });
    ctx.on(canvas, 'contextmenu', e => e.preventDefault());

    $$('.tool').forEach(btn => {
      ctx.on(btn, 'click', () => {
        commitText(); tool = btn.dataset.tool;
        $$('.tool').forEach(b => b.classList.toggle('active', b === btn));
        canvas.style.cursor = (tool === 'text') ? 'text' : 'crosshair';
      });
    });
    
    ctx.on(colorPicker, 'input', () => color = colorPicker.value);
    
    // 监听应用内自带的主题切换按钮
    ctx.on(window, 'toolbox:themechange', e => {
      // 稍微延时以确保 CSS 颜色变量已应用
      ctx.setTimeout(checkAndUpdatePenColor, 50);
    });

    ctx.on(sizeRange, 'input', () => { brushSize = Number(sizeRange.value); sizeLabel.textContent = brushSize; });
    ctx.on(undoBtn, 'click', undo); ctx.on(redoBtn, 'click', redo);
    ctx.on($('#clearBtn'), 'click', clearBoard); ctx.on($('#saveBtn'), 'click', saveImage);
    ctx.on($('#addBoardBtn'), 'click', addBoard);

    ctx.on($('#bgBtn'), 'click', e => {
      e.stopPropagation();
      const willOpen = !bgPanel.classList.contains('open');
      bgPanel.classList.toggle('open', willOpen); if(willOpen) updateBgUI();
    });
    ctx.onActive(document, 'pointerdown', e => {
      if(!bgPanel.classList.contains('open')) return;
      if(bgPanel.contains(e.target) || $('#bgBtn').contains(e.target)) return;
      bgPanel.classList.remove('open');
    });

    ctx.on($('#bgApply'), 'click', () => setBoardBackground(bgUrl.value.trim(), bgFit.value));
    ctx.on(bgUrl, 'keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); setBoardBackground(bgUrl.value.trim(), bgFit.value); } });
    ctx.on($('#bgUpload'), 'click', () => $('#bgFile').click());
    ctx.on($('#bgFile'), 'change', () => {
      const file = $('#bgFile').files && $('#bgFile').files[0]; if(!file) return;
      if(!/^image\//.test(file.type)){ ctx.toast('请选择图片文件', 'warn'); return; }
      const reader = new FileReader();
      reader.onload = () => setBoardBackground(String(reader.result), bgFit.value);
      reader.readAsDataURL(file); $('#bgFile').value = '';
    });
    ctx.on(bgFit, 'change', () => { const b = getActive(); if(b && b.bg){ b.bg.fit = bgFit.value; applyBgCss(b); } });
    ctx.on(bgRemove, 'click', removeBoardBackground);

    // 拖拽上传
    function isImageDrag(e){
      if(!e.dataTransfer || !e.dataTransfer.types) return false;
      return e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/plain');
    }
    ctx.on(wrap, 'dragenter', e => { if(!isImageDrag(e)) return; e.preventDefault(); e.stopPropagation(); dragDepth++; dropOverlay.classList.add('show'); });
    ctx.on(wrap, 'dragover', e => { if(!isImageDrag(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; });
    ctx.on(wrap, 'dragleave', e => { if(!isImageDrag(e)) return; e.preventDefault(); e.stopPropagation(); dragDepth--; if(dragDepth <= 0){ dragDepth = 0; dropOverlay.classList.remove('show'); } });
    ctx.on(wrap, 'drop', e => {
      e.preventDefault(); e.stopPropagation(); dragDepth = 0; dropOverlay.classList.remove('show');
      if(activeInput) commitText();
      const dt = e.dataTransfer; if(!dt) return;
      if(dt.files && dt.files.length > 0){
        const file = dt.files[0];
        if(!/^image\//.test(file.type)){ ctx.toast('只能拖入图片文件', 'warn'); return; }
        const reader = new FileReader(); reader.onload = () => setBoardBackground(String(reader.result), bgFit.value); reader.readAsDataURL(file); return;
      }
      let url = '';
      try { url = dt.getData('text/uri-list') || dt.getData('text/plain') || ''; } catch(_){}
      url = url.split('\n').map(s => s.trim()).find(s => s && s.charAt(0) !== '#') || '';
      if(!url){ ctx.toast('未识别到有效的图片', 'warn'); return; }
      if(/^(https?:|data:image\/|blob:)/i.test(url)) setBoardBackground(url, bgFit.value);
      else ctx.toast('拖入的内容不是有效的图片地址', 'warn');
    });

    // 快捷键
    ctx.onActive(window, 'keydown', e => {
      if(activeInput) return;
      const mod = e.ctrlKey || e.metaKey; if(!mod) return;
      const k = e.key.toLowerCase();
      if(k === 'z' && !e.shiftKey){ e.preventDefault(); undo(); }
      else if((k === 'z' && e.shiftKey) || k === 'y'){ e.preventDefault(); redo(); }
    });

    // 初始化
    if(window.ResizeObserver){ new ResizeObserver(scheduleResize).observe(wrap); }
    else window.addEventListener('resize', scheduleResize);

    ctx.setTimeout(() => { 
      resizeCanvas(); 
      sizeLabel.textContent = brushSize; 
      checkAndUpdatePenColor(); // 刚进来探测一次
      addBoard(); 
    }, 50);
  }
});
})(window);
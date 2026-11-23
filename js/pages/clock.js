(function(global){
'use strict';
const App = global.App;

App.registerPage('clock', {
  title: '多功能时钟',
  fullTitle: '⏰ 多功能时钟',

  template: () => `
    <div class="page page-clock">
      <div class="clk-app">

        <section class="clk-hero">
          <div class="clk-hero-top">
            <select class="clk-tz-select" id="tzSelect" title="选择显示的时区"></select>
          </div>
          <div class="clk-big-time" id="mainTime">--:--:--</div>
          <div class="clk-big-date" id="mainDate">正在加载…</div>
          <div class="clk-hero-meta">
            <div class="clk-meta-item">
              <span class="clk-meta-label">系统本地时间</span>
              <span class="clk-meta-value" id="localLine">--:--:--</span>
            </div>
          </div>
        </section>

        <nav class="clk-tabs">
          <button class="clk-tab active" data-tab="countdown">倒计时</button>
          <button class="clk-tab" data-tab="stopwatch">秒表</button>
          <button class="clk-tab" data-tab="alarm">闹钟</button>
          <button class="clk-tab" data-tab="pomodoro">番茄钟</button>
        </nav>

        <section class="clk-panel active" id="panel-countdown">
          <div class="clk-display" id="cdDisplay">00:05:00</div>
          <div class="clk-progress"><div class="clk-progress-bar" id="cdBar"></div></div>
          <div class="clk-row">
            <label>时 <input type="number" id="cdH" min="0" max="99" value="0"></label>
            <label>分 <input type="number" id="cdM" min="0" max="59" value="5"></label>
            <label>秒 <input type="number" id="cdS" min="0" max="59" value="0"></label>
          </div>
          <div class="clk-row">
            <button class="clk-btn primary" id="cdToggle">开始</button>
            <button class="clk-btn" id="cdReset">重置</button>
          </div>
          <div class="clk-row">
            <button class="clk-btn ghost small" data-cd="60">1 分钟</button>
            <button class="clk-btn ghost small" data-cd="300">5 分钟</button>
            <button class="clk-btn ghost small" data-cd="600">10 分钟</button>
            <button class="clk-btn ghost small" data-cd="1800">30 分钟</button>
          </div>
        </section>

        <section class="clk-panel" id="panel-stopwatch">
          <div class="clk-display" id="swDisplay">00:00.00</div>
          <div class="clk-row">
            <button class="clk-btn primary" id="swToggle">开始</button>
            <button class="clk-btn" id="swLap">计次</button>
            <button class="clk-btn danger" id="swReset">重置</button>
          </div>
          <ul class="clk-laps" id="lapList"></ul>
        </section>

        <section class="clk-panel" id="panel-alarm">
          <div class="clk-row">
            <input type="time" id="alarmTime" value="07:30">
            <input type="text" id="alarmLabel" placeholder="标签（可选）" maxlength="20">
            <button class="clk-btn primary" id="alarmAdd">添加闹钟</button>
          </div>
          <ul class="clk-alarm-list" id="alarmList"></ul>
        </section>

        <section class="clk-panel" id="panel-pomodoro">
          <div class="clk-pomo-mode" id="pomoMode">专注</div>
          <div class="clk-display" id="pomoDisplay">25:00</div>
          <div class="clk-progress"><div class="clk-progress-bar" id="pomoBar"></div></div>
          <div class="clk-row">
            <button class="clk-btn primary" id="pomoToggle">开始</button>
            <button class="clk-btn" id="pomoReset">重置</button>
            <button class="clk-btn ghost" id="pomoSkip">跳过</button>
          </div>
          <div class="clk-row">
            <label>专注 <input type="number" id="pomoFocus" min="1" max="120" value="25"></label>
            <label>短休 <input type="number" id="pomoBreak" min="1" max="60" value="5"></label>
            <label>长休 <input type="number" id="pomoLong" min="1" max="60" value="15"></label>
          </div>
          <div class="clk-pomo-dots" id="pomoDots"></div>
        </section>

      </div>
    </div>`,

  mount(root, ctx) {
    const $ = sel => root.querySelector(sel);
    const $$ = sel => Array.from(root.querySelectorAll(sel));
    const pad = (n, len = 2) => String(n).padStart(len, '0');

    /* ---------- 音频 ---------- */
    let audioCtx = null;
    function ensureAudio() {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    }
    function beep(freq = 880, dur = 0.15, vol = 0.25, type = 'sine', delay = 0) {
      const ac = ensureAudio();
      if (!ac) return;
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ac.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    }
    ctx.onCleanup(() => {
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    });

    /* ---------- 页面级 toast（挂到 body 保证跨页可见） ---------- */
    const toastEl = document.createElement('div');
    toastEl.className = 'clk-toast-global';
    document.body.appendChild(toastEl);
    ctx.onCleanup(() => toastEl.remove());

    let ringTimer = null;
    let toastTimer = null;

    function startRing(durationMs = 60000) {
      if (ringTimer) return;
      const endAt = Date.now() + durationMs;
      const ring = () => {
        if (Date.now() >= endAt) { stopRing(); return; }
        beep(880, 0.12, 0.3, 'sine');
        beep(1174, 0.12, 0.3, 'sine', 0.15);
      };
      ring();
      ringTimer = ctx.setInterval(ring, 500);
    }
    function stopRing() {
      if (ringTimer) { ctx.clearInterval(ringTimer); ringTimer = null; }
      toastEl.classList.remove('show');
      if (toastTimer) { ctx.clearTimeout(toastTimer); toastTimer = null; }
    }
    function showToast(msg, duration = 6000) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      if (toastTimer) ctx.clearTimeout(toastTimer);
      toastTimer = ctx.setTimeout(() => {
        toastEl.classList.remove('show');
        toastTimer = null;
      }, duration);
    }
    ctx.on(toastEl, 'click', stopRing);

    /* ---------- 时区工具 ---------- */
    const WEEKDAY_CN = { Mon:'周一', Tue:'周二', Wed:'周三', Thu:'周四', Fri:'周五', Sat:'周六', Sun:'周日' };
    const zoneFmtCache = new Map();
    function getZonedParts(ms, tz) {
      let dtf = zoneFmtCache.get(tz);
      if (!dtf) {
        dtf = new Intl.DateTimeFormat('en-US', {
          timeZone: tz, hour12: false,
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          weekday: 'short'
        });
        zoneFmtCache.set(tz, dtf);
      }
      const parts = {};
      for (const p of dtf.formatToParts(new Date(ms))) {
        if (p.type !== 'literal') parts[p.type] = p.value;
      }
      if (parts.hour === '24') parts.hour = '00';
      return parts;
    }
    function zoneOffsetLabel(tz, ms) {
      const p = getZonedParts(ms, tz);
      const secMs = Math.floor(ms / 1000) * 1000;
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      const off = Math.round((asUTC - secMs) / 60000);
      const sign = off >= 0 ? '+' : '-';
      const a = Math.abs(off);
      return `UTC${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
    }

    const TZ_LIST = [
      { z:'Asia/Shanghai', n:'中国标准时间 · 上海' },
      { z:'Asia/Hong_Kong', n:'香港' },
      { z:'Asia/Taipei', n:'台北' },
      { z:'Asia/Tokyo', n:'东京' },
      { z:'Asia/Seoul', n:'首尔' },
      { z:'Asia/Singapore', n:'新加坡' },
      { z:'Asia/Bangkok', n:'曼谷' },
      { z:'Asia/Kolkata', n:'印度 · 加尔各答' },
      { z:'Asia/Dubai', n:'迪拜' },
      { z:'Europe/Moscow', n:'莫斯科' },
      { z:'Europe/Berlin', n:'柏林' },
      { z:'Europe/Paris', n:'巴黎' },
      { z:'Europe/London', n:'伦敦' },
      { z:'America/Sao_Paulo', n:'圣保罗' },
      { z:'America/New_York', n:'纽约' },
      { z:'America/Chicago', n:'芝加哥' },
      { z:'America/Denver', n:'丹佛' },
      { z:'America/Los_Angeles', n:'洛杉矶' },
      { z:'Australia/Sydney', n:'悉尼' },
      { z:'Pacific/Auckland', n:'奥克兰' },
      { z:'UTC', n:'协调世界时 UTC' }
    ];

    const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let displayTZ = LOCAL_TZ;

    function populateTZSelect() {
      const sel = $('#tzSelect');
      sel.innerHTML = '';
      const localOpt = document.createElement('option');
      localOpt.value = LOCAL_TZ;
      localOpt.textContent = `本地 · ${LOCAL_TZ}`;
      sel.appendChild(localOpt);
      for (const t of TZ_LIST) {
        if (t.z === LOCAL_TZ) continue;
        const o = document.createElement('option');
        o.value = t.z; o.textContent = t.n;
        sel.appendChild(o);
      }
      sel.value = LOCAL_TZ;
    }
    ctx.on($('#tzSelect'), 'change', e => {
      displayTZ = e.target.value;
      lastClockSec = -1;
      renderClock(Date.now());
    });

    /* ---------- 主时钟 ---------- */
    let lastClockSec = -1;
    function renderClock(now) {
      const sec = Math.floor(now / 1000);
      if (sec === lastClockSec) return;
      lastClockSec = sec;
      const p = getZonedParts(now, displayTZ);
      $('#mainTime').textContent = `${p.hour}:${p.minute}:${p.second}`;
      $('#mainDate').textContent =
        `${p.year}年${p.month}月${p.day}日 ${WEEKDAY_CN[p.weekday] || ''} · ${zoneOffsetLabel(displayTZ, now)}`;
      const lp = getZonedParts(now, LOCAL_TZ);
      $('#localLine').textContent = `${lp.hour}:${lp.minute}:${lp.second}  (${LOCAL_TZ})`;
    }

    /* ---------- 倒计时 ---------- */
    const cd = { total: 5*60*1000, remaining: 5*60*1000, endAt: 0, running: false, paused: false };
    function cdReadInputs() {
      const h = Math.min(99, Math.max(0, +$('#cdH').value || 0));
      const m = Math.min(59, Math.max(0, +$('#cdM').value || 0));
      const s = Math.min(59, Math.max(0, +$('#cdS').value || 0));
      return (h * 3600 + m * 60 + s) * 1000;
    }
    function cdRender() {
      const rem = Math.max(0, cd.remaining);
      const totalSec = Math.ceil(rem / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      $('#cdDisplay').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
      const pct = cd.total > 0 ? (1 - rem / cd.total) * 100 : 0;
      $('#cdBar').style.width = Math.min(100, Math.max(0, pct)) + '%';
      $('#cdToggle').textContent = cd.running ? '暂停' : (cd.paused ? '继续' : '开始');
    }
    function cdToggle() {
      ensureAudio();
      if (cd.running) {
        cd.remaining = Math.max(0, cd.endAt - Date.now());
        cd.running = false; cd.paused = true;
      } else {
        if (!cd.paused || cd.remaining <= 0) {
          cd.total = cdReadInputs();
          if (cd.total <= 0) return;
          cd.remaining = cd.total;
        }
        cd.endAt = Date.now() + cd.remaining;
        cd.running = true; cd.paused = false;
      }
      cdRender();
    }
    function cdReset() {
      cd.running = false; cd.paused = false;
      cd.total = cdReadInputs(); cd.remaining = cd.total;
      cdRender();
    }
    function updateCountdown(now) {
      if (!cd.running) return;
      const rem = cd.endAt - now;
      if (rem <= 0) {
        cd.running = false; cd.paused = false; cd.remaining = 0;
        cdRender();
        startRing(60000);
        showToast('⏱ 倒计时结束！(点击弹窗关闭铃声)', 60000);
      } else {
        cd.remaining = rem; cdRender();
      }
    }
    ctx.on($('#cdToggle'), 'click', cdToggle);
    ctx.on($('#cdReset'), 'click', cdReset);
    ['cdH','cdM','cdS'].forEach(id => {
      ctx.on($('#' + id), 'input', () => { if (!cd.running) cdReset(); });
    });
    $$('[data-cd]').forEach(btn => {
      ctx.on(btn, 'click', () => {
        const sec = +btn.dataset.cd;
        $('#cdH').value = Math.floor(sec / 3600);
        $('#cdM').value = Math.floor((sec % 3600) / 60);
        $('#cdS').value = sec % 60;
        if (!cd.running) cdReset();
      });
    });

    /* ---------- 秒表 ---------- */
    const sw = { running: false, startAt: 0, elapsed: 0, laps: [] };
    function swCurrent() { return sw.elapsed + (sw.running ? Date.now() - sw.startAt : 0); }
    function fmtSW(ms) {
      const totalCs = Math.floor(ms / 10);
      const cs = totalCs % 100;
      const totalSec = Math.floor(totalCs / 100);
      const s = totalSec % 60;
      const m = Math.floor(totalSec / 60) % 60;
      const h = Math.floor(totalSec / 3600);
      return h > 0
        ? `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`
        : `${pad(m)}:${pad(s)}.${pad(cs)}`;
    }
    function swRender() {
      $('#swDisplay').textContent = fmtSW(swCurrent());
      $('#swToggle').textContent = sw.running ? '暂停' : (sw.elapsed > 0 ? '继续' : '开始');
    }
    function renderLaps() {
      $('#lapList').innerHTML = sw.laps
        .map((ms, i) => `<li><span class="clk-lap-idx">#${i + 1}</span><span>${fmtSW(ms)}</span></li>`)
        .join('');
      const ul = $('#lapList');
      ul.scrollTop = ul.scrollHeight;
    }
    ctx.on($('#swToggle'), 'click', () => {
      ensureAudio();
      if (sw.running) {
        sw.elapsed += Date.now() - sw.startAt;
        sw.running = false;
      } else {
        sw.startAt = Date.now();
        sw.running = true;
      }
      swRender();
    });
    ctx.on($('#swLap'), 'click', () => {
      const t = swCurrent();
      if (t === 0 && sw.laps.length === 0) return;
      sw.laps.push(t); renderLaps();
    });
    ctx.on($('#swReset'), 'click', () => {
      sw.running = false; sw.elapsed = 0; sw.startAt = 0; sw.laps = [];
      renderLaps(); swRender();
    });

    /* ---------- 闹钟 ---------- */
    let alarms = [];
    const ALARM_KEY = 'multiClock.alarms';
    function loadAlarms() {
      try {
        const raw = localStorage.getItem(ALARM_KEY);
        alarms = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(alarms)) alarms = [];
      } catch { alarms = []; }
    }
    function saveAlarms() {
      try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarms)); } catch {}
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }
    function renderAlarms() {
      const ul = $('#alarmList');
      if (!alarms.length) {
        ul.innerHTML = '<li class="clk-empty-tip">还没有闹钟，添加一个吧 ⏰</li>';
        return;
      }
      alarms.sort((a, b) => a.time.localeCompare(b.time));
      ul.innerHTML = alarms.map(a => `
        <li class="clk-alarm-item ${a.enabled ? '' : 'off'}">
          <span class="clk-alarm-time">${a.time}</span>
          <span class="clk-alarm-label">${escapeHtml(a.label || '闹钟')}</span>
          <button class="clk-btn small ghost" data-act="toggle" data-id="${a.id}">
            ${a.enabled ? '关闭' : '开启'}
          </button>
          <button class="clk-btn small danger" data-act="del" data-id="${a.id}">删除</button>
        </li>
      `).join('');
    }
    ctx.on($('#alarmList'), 'click', e => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      const idx = alarms.findIndex(a => a.id === id);
      if (idx === -1) return;
      if (btn.dataset.act === 'del') {
        alarms.splice(idx, 1);
      } else if (btn.dataset.act === 'toggle') {
        alarms[idx].enabled = !alarms[idx].enabled;
        if (alarms[idx].enabled) alarms[idx].lastFired = '';
      }
      saveAlarms(); renderAlarms();
    });
    ctx.on($('#alarmAdd'), 'click', () => {
      ensureAudio();
      const time = $('#alarmTime').value;
      if (!/^\d{2}:\d{2}$/.test(time)) { showToast('请选择有效的时间'); return; }
      const label = $('#alarmLabel').value.trim();
      alarms.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        time, label, enabled: true, lastFired: ''
      });
      $('#alarmLabel').value = '';
      saveAlarms(); renderAlarms();
      showToast(`已添加闹钟 ${time}${label ? ' · ' + label : ''}`);
    });
    function checkAlarms(now) {
      if (!alarms.length) return;
      const d = new Date(now);
      const hhmm = pad(d.getHours()) + ':' + pad(d.getMinutes());
      const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      let changed = false;
      for (const a of alarms) {
        if (!a.enabled) continue;
        if (a.time !== hhmm) continue;
        if (a.lastFired === today) continue;
        a.lastFired = today;
        changed = true;
        startRing(60000);
        showToast(`⏰ 闹钟响铃：${a.time}${a.label ? ' · ' + a.label : ''} (点击弹窗关闭)`, 60000);
      }
      if (changed) saveAlarms();
    }

    /* ---------- 番茄钟 ---------- */
    const pomo = { mode:'focus', running:false, paused:false, endAt:0, remaining:0, total:0, completed:0 };
    const POMO_MODE_TEXT = { focus:'专注', short:'短休息', long:'长休息' };
    function pomoDuration(mode) {
      const f = Math.min(120, Math.max(1, +$('#pomoFocus').value || 25)) * 60000;
      const b = Math.min(60, Math.max(1, +$('#pomoBreak').value || 5)) * 60000;
      const l = Math.min(60, Math.max(1, +$('#pomoLong').value || 15)) * 60000;
      return mode === 'focus' ? f : mode === 'short' ? b : l;
    }
    function pomoRender() {
      const rem = Math.max(0, pomo.remaining);
      const totalSec = Math.ceil(rem / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      $('#pomoDisplay').textContent = `${pad(m)}:${pad(s)}`;
      const pct = pomo.total > 0 ? (1 - rem / pomo.total) * 100 : 0;
      $('#pomoBar').style.width = Math.min(100, Math.max(0, pct)) + '%';
      const modeEl = $('#pomoMode');
      modeEl.textContent = POMO_MODE_TEXT[pomo.mode];
      modeEl.className = 'clk-pomo-mode' + (pomo.mode === 'focus' ? '' : ' break');
      $('#pomoToggle').textContent = pomo.running ? '暂停' : (pomo.paused ? '继续' : '开始');
      const dots = $('#pomoDots');
      dots.innerHTML = '';
      const doneCount = pomo.completed % 4 === 0 && pomo.completed > 0 ? 4 : pomo.completed % 4;
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('span');
        d.className = 'clk-dot' + (i < doneCount ? ' done' : '');
        dots.appendChild(d);
      }
    }
    function pomoSetPhase(mode) {
      pomo.mode = mode;
      pomo.total = pomoDuration(mode);
      pomo.remaining = pomo.total;
      pomo.running = false; pomo.paused = false;
      pomoRender();
    }
    function pomoToggle() {
      ensureAudio();
      if (pomo.running) {
        pomo.remaining = Math.max(0, pomo.endAt - Date.now());
        pomo.running = false; pomo.paused = true;
      } else {
        if (!pomo.paused || pomo.remaining <= 0) {
          pomo.total = pomoDuration(pomo.mode);
          pomo.remaining = pomo.total;
        }
        pomo.endAt = Date.now() + pomo.remaining;
        pomo.running = true; pomo.paused = false;
      }
      pomoRender();
    }
    function pomoFinish() {
      pomo.running = false; pomo.paused = false;
      if (pomo.mode === 'focus') {
        pomo.completed++;
        startRing(10000);
        showToast('🍅 专注结束！休息一下吧 (点击弹窗关闭)', 10000);
        pomoSetPhase(pomo.completed % 4 === 0 ? 'long' : 'short');
      } else {
        startRing(10000);
        showToast('☕ 休息结束，继续专注！(点击弹窗关闭)', 10000);
        pomoSetPhase('focus');
      }
    }
    function updatePomodoro(now) {
      if (!pomo.running) return;
      const rem = pomo.endAt - now;
      if (rem <= 0) pomoFinish();
      else { pomo.remaining = rem; pomoRender(); }
    }
    ctx.on($('#pomoToggle'), 'click', pomoToggle);
    ctx.on($('#pomoReset'), 'click', () => pomoSetPhase(pomo.mode));
    ctx.on($('#pomoSkip'), 'click', () => {
      ensureAudio();
      if (pomo.mode === 'focus') {
        pomo.completed++;
        pomoSetPhase(pomo.completed % 4 === 0 ? 'long' : 'short');
      } else {
        pomoSetPhase('focus');
      }
    });
    ['pomoFocus','pomoBreak','pomoLong'].forEach(id => {
      ctx.on($('#' + id), 'input', () => {
        if (!pomo.running && !pomo.paused) {
          pomo.total = pomoDuration(pomo.mode);
          pomo.remaining = pomo.total;
          pomoRender();
        }
      });
    });

    /* ---------- 标签页 ---------- */
    $$('.clk-tab').forEach(tab => {
      ctx.on(tab, 'click', () => {
        $$('.clk-tab').forEach(t => t.classList.toggle('active', t === tab));
        $$('.clk-panel').forEach(p => {
          p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab);
        });
      });
    });

    /* ---------- 主循环 ---------- */
    let lastAlarmSec = -1;
    function tick() {
      const now = Date.now();
      renderClock(now);
      updateCountdown(now);
      updatePomodoro(now);
      if (sw.running) $('#swDisplay').textContent = fmtSW(swCurrent());
      const sec = Math.floor(now / 1000);
      if (sec !== lastAlarmSec) {
        lastAlarmSec = sec;
        checkAlarms(now);
      }
    }

    /* ---------- 初始化 ---------- */
    populateTZSelect();
    loadAlarms();
    renderAlarms();
    cd.total = cdReadInputs(); cd.remaining = cd.total; cdRender();
    swRender(); renderLaps();
    pomo.total = pomoDuration('focus'); pomo.remaining = pomo.total; pomoRender();
    renderClock(Date.now());
    ctx.setInterval(tick, 50);
  }
});
})(window);
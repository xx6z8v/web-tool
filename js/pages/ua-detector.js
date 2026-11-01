(function(global){
'use strict';
const App = global.App;

App.registerPage('ua-detector', {
  title: '浏览器 UA 检测',

  template: () => `
    <div class="page page-ua">
      <div class="ua-app">
        <section class="ua-hero">
          <div class="ua-icon" id="ua-heroIcon">🌐</div>
          <div class="ua-main">
            <div class="ua-title" id="ua-heroName">检测中…</div>
            <div class="ua-sub" id="ua-heroVer"></div>
          </div>
          <div class="ua-badge" id="ua-heroBadge">—</div>
        </section>

        <div class="ua-sec-title">浏览器与系统</div>
        <div class="ua-grid" id="ua-gridA"></div>

        <div class="ua-sec-title">设备与环境</div>
        <div class="ua-grid" id="ua-gridB"></div>

        <div class="ua-box">
          <div class="ua-head">
            <span>原始 User-Agent</span>
            <div class="ua-actions">
              <button id="ua-toggleBtn" type="button">收起</button>
              <button id="ua-copyBtn" type="button">复制</button>
            </div>
          </div>
          <pre id="ua-rawUA"></pre>
        </div>
      </div>
    </div>`,

  mount(root, ctx){
    const $ = sel => root.querySelector(sel);
    const ua = navigator.userAgent;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const BROWSERS = [
      { name: 'Microsoft Edge',     icon: '🌊', re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
      { name: 'Opera',              icon: '🎭', re: /(?:OPR|OPiOS|Opera)\/([\d.]+)/ },
      { name: 'Samsung Internet',   icon: '📱', re: /SamsungBrowser\/([\d.]+)/ },
      { name: 'UC 浏览器',           icon: '🐿️', re: /UCBrowser\/([\d.]+)/ },
      { name: 'QQ 浏览器',           icon: '🐧', re: /(?:MQQBrowser|QQBrowser)\/([\d.]+)/ },
      { name: '微信内置浏览器',       icon: '💬', re: /MicroMessenger\/([\d.]+)/ },
      { name: 'Firefox',            icon: '🦊', re: /(?:Firefox|FxiOS)\/([\d.]+)/ },
      { name: 'Chrome',             icon: '🟢', re: /(?:Chrome|CriOS)\/([\d.]+)/ },
      { name: 'Safari',             icon: '🧭', re: /Version\/([\d.]+)[^)]*Safari/ },
      { name: 'Internet Explorer',  icon: '🅴', re: /(?:MSIE\s|rv:)([\d.]+)/ }
    ];

    function detectBrowser() {
      for(let i = 0; i < BROWSERS.length; i++){
        const m = ua.match(BROWSERS[i].re);
        if(m) return { name: BROWSERS[i].name, icon: BROWSERS[i].icon, version: m[1] };
      }
      const uad = navigator.userAgentData;
      if(uad && uad.brands){
        for(let j = 0; j < uad.brands.length; j++){
          if(!/Not.?A.?Brand/i.test(uad.brands[j].brand)){
            return { name: uad.brands[j].brand, icon: '🌐', version: uad.brands[j].version || '—' };
          }
        }
      }
      return { name: '未知浏览器', icon: '❓', version: '—' };
    }

    function detectOS() {
      let m;
      if(/Windows Phone/.test(ua)) return { name: 'Windows Phone', version: '' };
      if((m = ua.match(/Windows NT ([\d.]+)/))){
        const map = { '10.0': '10 / 11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.2': 'XP x64', '5.1': 'XP' };
        return { name: 'Windows', version: map[m[1]] || ('NT ' + m[1]) };
      }
      if((m = ua.match(/Android\s+([\d.]+)/))) return { name: 'Android', version: m[1] };
      if((m = ua.match(/(?:iPhone|iPad|iPod).*?OS ([\d_]+)/))) return { name: 'iOS', version: m[1].replace(/_/g, '.') };
      if((m = ua.match(/Mac OS X ([\d_.]+)/))) return { name: 'macOS', version: m[1].replace(/_/g, '.') };
      if((m = ua.match(/CrOS \w+ ([\d.]+)/))) return { name: 'Chrome OS', version: m[1] };
      if(/Linux/.test(ua)) return { name: 'Linux', version: '' };
      return { name: '未知系统', version: '' };
    }

    function detectEngine() {
      if(/Trident\//.test(ua)) return 'Trident';
      if(/Edge\//.test(ua)) return 'EdgeHTML';
      if(/Gecko\/\d/.test(ua)) return 'Gecko';
      if(/AppleWebKit\//.test(ua)) return /(?:Chrome|Chromium|CriOS|Edg|OPR)\//.test(ua) ? 'Blink' : 'WebKit';
      if(/Presto/.test(ua)) return 'Presto';
      return '未知';
    }

    function detectDevice() {
      const uad = navigator.userAgentData;
      const touch = (navigator.maxTouchPoints || 0) > 1;
      if(/iPad|Tablet|PlayBook|Silk/i.test(ua)) return '平板设备';
      if(/Android/i.test(ua) && !/Mobile/i.test(ua)) return '平板设备';
      if(/Macintosh/.test(ua) && touch) return '平板设备';
      if(/Mobi|Android|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return '移动设备';
      if(uad && typeof uad.mobile === 'boolean') return uad.mobile ? '移动设备' : '桌面设备';
      return '桌面设备';
    }

    function detectModel() {
      const m = ua.match(/Android\s+[\d.]+;\s*(?:[a-z]{2}[-_][a-z]{2};\s*)?([^;)]+)/i);
      if(m && m[1]) return m[1].replace(/\s*Build\/.*/i, '').replace(/_/g, ' ').trim();
      if(/iPhone/.test(ua)) return 'iPhone';
      if(/iPad/.test(ua)) return 'iPad';
      if(/iPod/.test(ua)) return 'iPod';
      return '—';
    }

    function renderCards(elId, items) {
      let html = '';
      items.forEach(item => {
        if(item[1] === undefined || item[1] === null || item[1] === '') return;
        const val = esc(item[1]);
        html += `<div class="ua-card" title="${esc(item[0])}: ${val}">
          <div class="k">${esc(item[0])}</div>
          <div class="v">${val}</div>
        </div>`;
      });
      $(elId).innerHTML = html;
    }

    const browser = detectBrowser();
    const os = detectOS();
    const engine = detectEngine();
    const device = detectDevice();
    const model = detectModel();

    $('#ua-heroIcon').textContent = browser.icon;
    $('#ua-heroName').textContent = browser.name;
    $('#ua-heroVer').textContent = '版本 ' + browser.version;
    $('#ua-heroBadge').textContent = device;

    const osText = os.name + (os.version ? ' ' + os.version : '');

    renderCards('#ua-gridA', [
      ['浏览器', browser.name],
      ['版本', browser.version],
      ['渲染引擎', engine],
      ['操作系统', osText],
      ['设备类型', device],
      ['设备型号', model]
    ]);

    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages.join(', ') : (navigator.language || '—');
    let tz = '—';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '—'; } catch(e){}

    renderCards('#ua-gridB', [
      ['分辨率', screen.width + ' × ' + screen.height],
      ['可用屏幕', screen.availWidth + ' × ' + screen.availHeight],
      ['视口尺寸', window.innerWidth + ' × ' + window.innerHeight],
      ['像素比', (window.devicePixelRatio || 1) + 'x'],
      ['颜色深度', (screen.colorDepth || '—') + ' 位'],
      ['系统语言', navigator.language || '—'],
      ['语言列表', langs],
      ['时区', tz],
      ['CPU', navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' 核' : '不可用'],
      ['内存', navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '不可用'],
      ['触摸点数', (navigator.maxTouchPoints || 0) + ' 点'],
      ['Cookie', navigator.cookieEnabled ? '已启用' : '已禁用']
    ]);

    const rawPre = $('#ua-rawUA');
    const toggleBtn = $('#ua-toggleBtn');
    const mq = window.matchMedia('(max-width: 640px)');
    rawPre.textContent = ua;

    function setCollapsed(collapsed) {
      rawPre.classList.toggle('hidden', collapsed);
      toggleBtn.textContent = collapsed ? '展开' : '收起';
    }
    setCollapsed(mq.matches);

    ctx.on(toggleBtn, 'click', () => setCollapsed(!rawPre.classList.contains('hidden')));
    
    // 监听窗口大小变化以自动展开/收起
    const mqListener = e => setCollapsed(e.matches);
    if(mq.addEventListener) mq.addEventListener('change', mqListener);
    else if(mq.addListener) mq.addListener(mqListener);
    ctx.onCleanup(() => {
      if(mq.removeEventListener) mq.removeEventListener('change', mqListener);
      else if(mq.removeListener) mq.removeListener(mqListener);
    });

    // 复制事件
    const copyBtn = $('#ua-copyBtn');
    ctx.on(copyBtn, 'click', () => {
      App.ui.copyText(ua, copyBtn);
    });
  }
});
})(window);
(function(global){
'use strict';
const App = global.App;
const Router = global.Router;

/* =========================================================
   工具配置表
   ========================================================= */
const TOOLS_CONFIG = [
  { id: 'home', name: '主页', icon: '🏠', cat: '概览', desc: '', hideCard: true },

  // 密码与安全
  { id: 'password',            name: '密码生成器',     icon: '🔐', cat: '密码与安全', desc: '长度 / 字符种类 / 符号范围 / 各类奇葩规则' },
  { id: 'qr-generator',        name: '二维码生成',     icon: '📱', cat: '密码与安全', desc: '文本或网址转二维码，支持导出 PNG / SVG' },
  { id: 'totp',                name: '两步验证 TOTP',  icon: '🛡️', cat: '密码与安全', desc: '基于时间的动态验证码，支持本地计算' },

  // 文本与文档
  { id: 'markdown-editor',     name: 'Markdown 编辑',  icon: '✍️', cat: '文本与文档', desc: '实时预览、格式快捷栏、导出 HTML/MD' },
  { id: 'markdown-reader',     name: 'Markdown 阅读',  icon: '📖', cat: '文本与文档', desc: '拖拽打开、代码高亮、大纲、全文搜索' },
  { id: 'markdown-cheatsheet', name: 'Markdown 语法',  icon: '📝', cat: '文本与文档', desc: '基础 / 标准 / 扩展语法，附带渲染效果预览' },
  { id: 'c-cheatsheet',        name: 'C 语法速查',     icon: '📘', cat: '文本与文档', desc: '关键词搜索、代码复制、Bing / Google 外链' },

  // 开发者与测试
  { id: 'whiteboard',          name: '云画板',         icon: '🎨', cat: '开发者与测试', desc: '多画布、撤销重做、背景图、导出 PNG' },
  { id: 'zip-tool',            name: 'ZIP 压缩解压',   icon: '📦', cat: '开发者与测试', desc: '解压筛选导出 / 多文件打包压缩，全程本地' },
  { id: 'ua-detector',         name: 'UA 检测',        icon: '🌐', cat: '开发者与测试', desc: '识别浏览器、系统、设备型号与环境信息' }
];

/* =========================================================
   自动生成侧边栏
   ========================================================= */
function buildSidebar() {
  const groups = {};
  TOOLS_CONFIG.forEach(t => {
    if (!groups[t.cat]) groups[t.cat] = [];
    groups[t.cat].push(t);
  });

  let html = '';
  for (const cat in groups) {
    html += `<div class="nav-group-title">${cat}</div>`;
    groups[cat].forEach(item => {
      html += `<a class="nav-link" href="#${item.id}" data-id="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.name}</span>
      </a>`;
    });
  }
  document.getElementById('sidebarNav').innerHTML = html;
}

/* =========================================================
   注入 fullTitle（emoji + 文字），供顶栏显示
   主页除外（保留内部大标题，顶栏回落到 title = "主页"）
   ========================================================= */
function injectFullTitles() {
  TOOLS_CONFIG.forEach(t => {
    if (t.id === 'home') return;
    if (App._pages[t.id]) {
      App._pages[t.id].fullTitle = t.icon + ' ' + t.name;
    }
  });
}

/* =========================================================
   自动生成主页卡片（按分类分组）
   ========================================================= */
App.registerPage('home', {
  title: '主页',
  template: () => {
    const groups = {};
    TOOLS_CONFIG.forEach(t => {
      if (t.hideCard) return;
      if (!groups[t.cat]) groups[t.cat] = [];
      groups[t.cat].push(t);
    });

    let sectionsHtml = '';
    for (const cat in groups) {
      sectionsHtml += `
        <div class="home-section">
          <h2 class="home-section-title">${cat}</h2>
          <div class="home-grid">
            ${groups[cat].map(t => `
              <a class="home-card" href="#${t.id}">
                <span class="home-emoji">${t.icon}</span>
                <h3>${t.name}</h3>
                <p>${t.desc}</p>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="page page-home">
        <div class="page-inner">
          <div class="home-hero">
            <h1>工具箱 <span class="home-badge">测试版</span></h1>
            <p>常用小工具 · 全部本地运行 · 数据不上传服务器</p>
          </div>
          ${sectionsHtml}
        </div>
      </div>`;
  }
});

/* =========================================================
   启动应用
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  buildSidebar();

  /* ---- 为已注册页面注入完整标题 ---- */
  injectFullTitles();

  /* ---- 主题初始化：智能跟随系统 ---- */
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('toolbox:theme'); } catch(_){}

  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme) {
    App.setTheme(savedTheme, false);
  } else {
    App.setTheme(systemPrefersDark ? 'dark' : 'light', false);
  }

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mqListener = (e) => {
      if (!localStorage.getItem('toolbox:theme')) {
        App.setTheme(e.matches ? 'dark' : 'light', false);
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', mqListener);
    else if (mq.addListener) mq.addListener(mqListener);
  }

  document.getElementById('themeBtn').addEventListener('click', () => App.toggleTheme());

  /* ---- 侧边栏折叠 / 抽屉逻辑 ---- */
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const toggleBtn = document.getElementById('sidebarToggle');
  const isMobile = () => window.innerWidth <= 768;

  toggleBtn.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  backdrop.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    }
  });

  document.getElementById('sidebarNav').addEventListener('click', e => {
    if (e.target.closest('.nav-link') && isMobile()) {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    }
  });

  let lastIsMobile = isMobile();
  window.addEventListener('resize', () => {
    const nowMobile = isMobile();
    if (lastIsMobile !== nowMobile) {
      sidebar.classList.remove('open', 'collapsed');
      backdrop.classList.remove('show');
      lastIsMobile = nowMobile;
    }
  });

  /* ---- 全局快捷键 ---- */
  window.addEventListener('keydown', e => {
    if(!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if(k === 'd'){ e.preventDefault(); App.toggleTheme(); return; }

    const idx = parseInt(e.key, 10);
    if(idx >= 1 && idx <= TOOLS_CONFIG.length) {
      e.preventDefault();
      Router.go(TOOLS_CONFIG[idx - 1].id);
    }
  });

  Router.start('home');
});
})(window);
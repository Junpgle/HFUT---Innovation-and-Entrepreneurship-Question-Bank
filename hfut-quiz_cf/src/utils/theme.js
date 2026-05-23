// 🌗 全局日夜/暗色模式统一管理器 (Theme Manager) v2

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
  AUTO: 'auto' // 18:00 到次日 06:00 自动夜间模式
};

// 检查是否为晚上 18:00 到次日 06:00
const isNightTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6;
};

// 应用真实的暗色类名 dark 到 html 节点
export const applyTheme = (mode) => {
  const root = document.documentElement;
  let shouldDark = false;

  if (mode === THEME_MODES.DARK) {
    shouldDark = true;
  } else if (mode === THEME_MODES.LIGHT) {
    shouldDark = false;
  } else if (mode === THEME_MODES.SYSTEM) {
    shouldDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else if (mode === THEME_MODES.AUTO) {
    shouldDark = isNightTime();
  }

  if (shouldDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// ─── 监听器模块级状态（每次 init 前清理旧的，防止泄漏）────────────────────────
let _systemMediaList = null;
let _autoTimer = null;
let _systemHandler = null;

const _clearAll = () => {
  // 清理系统媒体查询监听
  if (_systemMediaList && _systemHandler) {
    try {
      if (_systemMediaList.removeEventListener) {
        _systemMediaList.removeEventListener('change', _systemHandler);
      } else if (_systemMediaList.removeListener) {
        _systemMediaList.removeListener(_systemHandler);
      }
    } catch { /* ignore */ }
  }
  _systemMediaList = null;
  _systemHandler = null;

  // 清理自动切换定时器
  if (_autoTimer !== null) {
    clearInterval(_autoTimer);
    _autoTimer = null;
  }
};

// 初始化日夜模式监听器与时钟轮询
// 每次调用前会先清理旧的，保证幂等性（兼容 React StrictMode 双次执行）
export const initThemeListener = () => {
  // 先清理旧的，避免泄漏
  _clearAll();

  // 1. 监听系统日夜模式改变
  if (typeof window !== 'undefined' && window.matchMedia) {
    _systemMediaList = window.matchMedia('(prefers-color-scheme: dark)');
    _systemHandler = () => {
      const currentMode = getThemeMode();
      if (currentMode === THEME_MODES.SYSTEM) {
        applyTheme(THEME_MODES.SYSTEM);
      }
    };
    try {
      if (_systemMediaList.addEventListener) {
        _systemMediaList.addEventListener('change', _systemHandler);
      } else if (_systemMediaList.addListener) {
        _systemMediaList.addListener(_systemHandler);
      }
    } catch { /* ignore */ }
  }

  // 2. 每分钟轮询一次，用于 Auto 自动时间切换模式
  if (typeof window !== 'undefined') {
    _autoTimer = setInterval(() => {
      const currentMode = getThemeMode();
      if (currentMode === THEME_MODES.AUTO) {
        applyTheme(THEME_MODES.AUTO);
        // 通知 React 状态同步（auto 模式下时间触发的切换）
        window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: THEME_MODES.AUTO }));
      }
    }, 60000);
  }
};

// 销毁监听（组件卸载时使用）
export const destroyThemeListener = () => {
  _clearAll();
};

// 从缓存中获取偏好的模式
export const getThemeMode = () => {
  if (typeof window === 'undefined') return THEME_MODES.SYSTEM;
  return localStorage.getItem('app_theme_mode') || THEME_MODES.SYSTEM;
};

// 写入/切换主题模式
export const setThemeMode = (mode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_theme_mode', mode);
  applyTheme(mode);
  // 向外抛出自定义事件，方便 SPA 中非 React 或者其它页面能够联动感知
  window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: mode }));
};

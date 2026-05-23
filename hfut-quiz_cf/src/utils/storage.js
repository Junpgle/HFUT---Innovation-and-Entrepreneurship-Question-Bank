import localforage from 'localforage';

// 识别“答题记录”与“本地自定义题库”等高体积、高频读写的键名，避免引起 localStorage quota 爆满与同步 I/O 阻塞
const isLargeDataKey = (key) => {
  return String(key).startsWith('app_') || String(key).startsWith('hf_') || String(key).startsWith('custom_');
};

export const safeGet = async (key, fallback = null) => {
  // 1. 优先从 localforage (IndexedDB) 中异步加载
  try {
    const v = await localforage.getItem(key);
    if (v !== null && v !== undefined) {
      // 成功在 IndexedDB 取得，若是答题记录大数据键，我们强制从 localStorage 中彻底清除残留的旧冗余，释放 5MB 额度
      if (isLargeDataKey(key)) {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      }
      return v;
    }
  } catch (err) {
    console.warn(`localforage.getItem(${key}) 失败`, err);
  }

  // 2. 若 IndexedDB 未加载到，尝试从 localStorage 中平移旧版珍贵数据
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        // 执行一键无损平滑平移，将其存入 IndexedDB 并从 localStorage 物理擦除
        await localforage.setItem(key, parsed);
        localStorage.removeItem(key);
        console.info(`[Storage Migration] 成功将答题数据 ${key} 从 localStorage 自动平移至 IndexedDB!`);
        return parsed;
      } catch (parseOrWriteErr) {
        console.warn(`[Storage Migration] 答题数据 ${key} 解析或平移写入 IndexedDB 失败`, parseOrWriteErr);
      }
    }
  } catch (err) {
    console.warn(`localStorage.getItem(${key}) 失败`, err);
  }

  return fallback;
};

export const safeSet = async (key, value) => {
  // 1. 纯异步高速存入 localforage (IndexedDB)
  try {
    await localforage.setItem(key, value);
  } catch (err) {
    console.warn(`localforage.setItem(${key}) 失败`, err);
  }

  // 2. 区分对待写入：若是答题记录或题库等大数据键，我们绝对不在 localStorage 写入任何冗余，
  // 而是仅执行 removeItem 清除历史残留；
  // 只有极轻量非答题记录数据（如用户信息等），才保留在 localStorage 冗余。
  if (isLargeDataKey(key)) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`localStorage.setItem(${key}) 失败`, err);
    }
  }
};

import localforage from 'localforage';

export const safeGet = async (key, fallback = null) => {
  try {
    const v = await localforage.getItem(key);
    if (v !== null && v !== undefined) {
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // Ignore localStorage errors.
      }
      return v;
    }
  } catch (err) {
    console.warn(`localforage.getItem(${key}) failed`, err);
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (err) {
    console.warn(`localStorage.getItem(${key}) failed`, err);
  }

  return fallback;
};

export const safeSet = async (key, value) => {
  try {
    await localforage.setItem(key, value);
  } catch (err) {
    console.warn(`localforage.setItem(${key}) failed`, err);
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`localStorage.setItem(${key}) failed`, err);
  }
};

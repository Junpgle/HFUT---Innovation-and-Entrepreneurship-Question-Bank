import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from './api';
import localforage from 'localforage';

const CACHE_KEY = 'app_interaction_cache_v2';
const CACHE_TTL = 5 * 60 * 1000;
const BATCH_INTERVAL = 5 * 60 * 1000;
const MAX_BATCH_SIZE = 200;

const defaultGet = async (key, fallback = null) => {
  try {
    const v = await localforage.getItem(key);
    if (v !== null && v !== undefined) {
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
      return v;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch {}
  return fallback;
};

const defaultSet = async (key, value) => {
  try { await localforage.setItem(key, value); } catch {}
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

const pendingCache = new Map();
function getCached(key) {
  const entry = pendingCache.get(key);
  if (entry && Date.now() - entry.ts < 10000) return entry.data;
  return null;
}
function setCached(key, data) {
  pendingCache.set(key, { data, ts: Date.now() });
}

export function useInteractionCache({ currentUser, apiLimitReached }) {
  const [cacheReady, setCacheReady] = useState(false);
  const seenIdsRef = useRef(new Set());
  const cacheRef = useRef({ threads: {}, updatedAt: 0 });
  const timerRef = useRef(null);
  const flushingRef = useRef(false);

  const loadFromStorage = useCallback(async () => {
    const saved = await defaultGet(CACHE_KEY);
    if (saved && saved.threads) {
      cacheRef.current = saved;
      setCacheReady(true);
      return saved;
    }
    setCacheReady(true);
    return null;
  }, []);

  const saveToStorage = useCallback(async () => {
    await defaultSet(CACHE_KEY, {
      threads: cacheRef.current.threads,
      updatedAt: cacheRef.current.updatedAt
    });
  }, []);

  const markSeen = useCallback((questionId) => {
    if (questionId) seenIdsRef.current.add(questionId);
  }, []);

  const markSeenBatch = useCallback((ids) => {
    for (const id of ids) {
      if (id) seenIdsRef.current.add(id);
    }
  }, []);

  const getThread = useCallback((questionId) => {
    if (!questionId) return null;
    const fromMem = cacheRef.current.threads[questionId];
    if (fromMem) return fromMem;
    const cached = getCached(questionId);
    if (cached) return cached;
    return null;
  }, []);

  const setThread = useCallback((questionId, data) => {
    cacheRef.current.threads[questionId] = data;
    setCached(questionId, data);
  }, []);

  const updateThreadLocally = useCallback((questionId, updater) => {
    const prev = cacheRef.current.threads[questionId] || { comments: [], explanations: [] };
    cacheRef.current.threads[questionId] = updater(prev);
  }, []);

  const refreshBatch = useCallback(async () => {
    if (!currentUser || apiLimitReached) return;
    const ids = Array.from(seenIdsRef.current).filter(Boolean);
    if (ids.length === 0) return;

    const staleIds = ids.filter(id => {
      const t = cacheRef.current.threads[id];
      return !t;
    });

    if (staleIds.length === 0) return;

    const chunks = [];
    for (let i = 0; i < staleIds.length; i += MAX_BATCH_SIZE) {
      chunks.push(staleIds.slice(i, i + MAX_BATCH_SIZE));
    }

    for (const chunk of chunks) {
      try {
        const res = await api.batchGetThreads(chunk);
        if (res && res.threads) {
          Object.assign(cacheRef.current.threads, res.threads);
        }
      } catch (e) {
        console.warn('[InteractionCache] batch refresh failed', e);
      }
    }

    cacheRef.current.updatedAt = Date.now();
    await saveToStorage();
  }, [currentUser, apiLimitReached, saveToStorage]);

  const refreshSingle = useCallback(async (questionId) => {
    if (!questionId || !currentUser || apiLimitReached) return null;
    try {
      const res = await api.request(`/thread/${questionId}`);
      if (res) {
        cacheRef.current.threads[questionId] = res;
        setCached(questionId, res);
        return res;
      }
    } catch (e) {
      console.warn('[InteractionCache] single refresh failed', questionId, e);
    }
    return null;
  }, [currentUser, apiLimitReached]);

  const warmupSeen = useCallback((questions) => {
    if (!questions?.length) return;
    for (const q of questions) {
      if (q?.id) seenIdsRef.current.add(q.id);
    }
  }, []);

  useEffect(() => {
    loadFromStorage().then(() => {
      const initialTimer = setTimeout(() => refreshBatch(), 2000);
      return () => clearTimeout(initialTimer);
    });
  }, [loadFromStorage, refreshBatch]);

  useEffect(() => {
    timerRef.current = setInterval(() => refreshBatch(), BATCH_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshBatch]);

  const forceRefresh = useCallback(async () => {
    cacheRef.current.threads = {};
    await refreshBatch();
  }, [refreshBatch]);

  return {
    cacheReady,
    getThread,
    setThread,
    updateThreadLocally,
    markSeen,
    markSeenBatch,
    refreshBatch,
    refreshSingle,
    warmupSeen,
    forceRefresh,
    saveToStorage
  };
}

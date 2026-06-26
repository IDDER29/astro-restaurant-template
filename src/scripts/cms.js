// src/scripts/cms.js
export const STORAGE_KEY = 'marmara_site_content';
const ok = (v) => typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null;

export function mergeContent(defaults, overrides) {
  const out = { ...defaults };
  for (const k of Object.keys(defaults)) if (ok(overrides?.[k])) out[k] = overrides[k];
  return out;
}
export function loadContent(storageKey, defaults, storage) {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return { ...defaults };
    return mergeContent(defaults, JSON.parse(raw));
  } catch { return { ...defaults }; }
}
export function saveContent(storageKey, content, storage) {
  storage.setItem(storageKey, JSON.stringify(content));
}

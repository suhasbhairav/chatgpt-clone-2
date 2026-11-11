// localStorage helpers. Every access is wrapped in try/catch because storage
// can be unavailable (private mode, blocked cookies) or full.
export const KEYS = {
  chats: "assist:v1:chats",
  settings: "assist:v1:settings",
  library: "assist:v1:library",
  shares: "assist:v1:shares",
  seeded: "assist:v1:seeded",
};

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

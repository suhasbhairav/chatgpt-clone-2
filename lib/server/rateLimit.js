// Fixed-window, in-memory rate limiter keyed by client IP. Fine for a single
// demo process; in production this lives in Valkey/Redis (see README).
const store = (globalThis.__assistRate ??= new Map());

export function clientKey(request) {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip")) || "local";
}

export function rateLimit(key, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.reset <= now) {
    entry = { count: 0, reset: now + windowMs };
    store.set(key, entry);
  }
  entry.count += 1;
  if (store.size > 10_000) {
    for (const [k, v] of store) if (v.reset <= now) store.delete(k);
  }
  return {
    ok: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.reset,
    limit,
  };
}

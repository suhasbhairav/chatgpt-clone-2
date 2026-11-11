// In-memory store for shared conversations. Lives on globalThis so every route
// module in this Node process sees the same Map. Data is lost on restart; the
// client also keeps a localStorage copy as a fallback (see README).
const shares = (globalThis.__assistShares ??= new Map());
const MAX_SHARES = 1000;

export function putShare(record) {
  if (shares.size >= MAX_SHARES) shares.delete(shares.keys().next().value);
  shares.set(record.id, record);
  return record;
}

export function getShare(id) {
  return shares.get(id) || null;
}

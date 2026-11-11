export function uid(prefix = "") {
  const rnd =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + rnd;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const DAY = 86_400_000;

export function groupLabel(ts, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (ts >= today) return "Today";
  if (ts >= today - DAY) return "Yesterday";
  if (ts >= today - 7 * DAY) return "Previous 7 days";
  if (ts >= today - 30 * DAY) return "Previous 30 days";
  return "Older";
}

export const GROUP_ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

// Formats a user message plus its attached files the way the API expects.
export function messageToApiContent(m) {
  if (!m.attachments?.length) return m.content;
  const files = m.attachments
    .map((a) => `<file name="${String(a.name).replace(/"/g, "'")}">\n${a.content || ""}\n</file>`)
    .join("\n\n");
  return `${files}\n\n${m.content}`;
}

export function chatToMarkdown(chat) {
  const lines = [`# ${chat.title}`, ""];
  for (const m of chat.messages) {
    lines.push(m.role === "user" ? "## You" : "## Assist", "");
    if (m.attachments?.length) lines.push(`Attached: ${m.attachments.map((a) => a.name).join(", ")}`, "");
    lines.push(m.content, "");
  }
  return lines.join("\n");
}

export function snippetAround(raw, q, radius = 50) {
  const text = raw.replace(/```[\w-]*|[`*#>|]/g, " ").replace(/\s+/g, " ");
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, i - radius);
  return (start > 0 ? "..." : "") + text.slice(start, i + q.length + radius).replace(/\s+/g, " ") + "...";
}

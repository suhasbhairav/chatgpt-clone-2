import { putShare } from "@/lib/server/shareStore";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";

const MAX_BYTES = 400_000;

// POST /api/share  { title, model, messages: [{role, content}] } -> { id, url }
export async function POST(request) {
  if (!rateLimit(`share:${clientKey(request)}`, { limit: 20 }).ok) {
    return Response.json({ error: "Too many shares, slow down." }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return Response.json({ error: "Conversation too large to share" }, { status: 413 });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content, attachments: (m.attachments || []).map((a) => ({ name: String(a.name || "file") })) }))
    : [];
  if (!messages.length) return Response.json({ error: "Nothing to share" }, { status: 400 });
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const record = {
    id,
    title: String(body.title || "Shared chat").slice(0, 120),
    model: String(body.model || "assist-5"),
    messages,
    createdAt: new Date().toISOString(),
  };
  putShare(record);
  return Response.json({ id, url: `/share/${id}` }, { status: 201 });
}

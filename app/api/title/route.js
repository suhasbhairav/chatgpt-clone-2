import { heuristicTitle } from "@/lib/demo";
import { createMessage, hasApiKey } from "@/lib/server/anthropic";
import { clientKey, rateLimit } from "@/lib/server/rateLimit";

export async function POST(request) {
  let text = "";
  try {
    ({ text = "" } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  text = String(text).slice(0, 2000);
  const fallback = heuristicTitle(text);
  if (!hasApiKey() || !rateLimit(`title:${clientKey(request)}`, { limit: 30 }).ok) {
    return Response.json({ title: fallback, source: "heuristic" });
  }
  try {
    const msg = await createMessage({
      model: "claude-haiku-5-5",
      max_tokens: 20,
      system:
        "Write a 2-5 word title for a chat that starts with the user's message. Sentence case, no quotes, no trailing punctuation. Reply with the title only.",
      messages: [{ role: "user", content: text }],
    });
    const title = (msg.content?.find((b) => b.type === "text")?.text || "").trim().replace(/^["']|["'.]$/g, "");
    return Response.json({ title: title.slice(0, 60) || fallback, source: "model" });
  } catch {
    return Response.json({ title: fallback, source: "heuristic" });
  }
}

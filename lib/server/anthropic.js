// Minimal Anthropic Messages API client (no SDK dependency).
// The API key is read from the environment on the server only and is never
// sent to the browser or written to logs.

const API_URL = "https://api.anthropic.com/v1/messages";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function headers() {
  return {
    "content-type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
}

export async function createMessage(body, signal) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...body, stream: false }),
    signal,
  });
  if (!res.ok) throw new Error(`Upstream error ${res.status}`);
  return res.json();
}

// Opens a streaming request and returns the raw upstream Response.
export async function openStream(body, signal) {
  return fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });
}

// Parses Anthropic's SSE stream and calls handlers for the events we use.
export async function pumpStream(res, { onText, onUsage, onStop }) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let evt;
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      switch (evt.type) {
        case "message_start":
          onUsage?.({ input_tokens: evt.message?.usage?.input_tokens ?? 0 });
          break;
        case "content_block_delta":
          if (evt.delta?.type === "text_delta") onText(evt.delta.text);
          break;
        case "message_delta":
          if (evt.usage) onUsage?.({ output_tokens: evt.usage.output_tokens ?? 0 });
          if (evt.delta?.stop_reason) onStop?.(evt.delta.stop_reason);
          break;
        case "error":
          throw new Error(evt.error?.message || "Upstream stream error");
        default:
          break;
      }
    }
  }
}

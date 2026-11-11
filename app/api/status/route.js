import { MODELS } from "@/lib/assistants";
import { hasApiKey } from "@/lib/server/anthropic";
import { connection } from "next/server";

// Tells the UI whether replies come from the live API or the offline demo responder.
export async function GET() {
  await connection();
  return Response.json({
    mode: hasApiKey() ? "live" : "demo",
    models: MODELS.map(({ id, label, description }) => ({ id, label, description })),
  });
}

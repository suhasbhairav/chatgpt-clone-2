import { getShare } from "@/lib/server/shareStore";

export async function GET(request, { params }) {
  const { id } = await params;
  const record = getShare(id);
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record, { headers: { "cache-control": "no-store" } });
}

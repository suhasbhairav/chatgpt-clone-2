import { ASSISTANTS } from "@/lib/assistants";

// Public gallery data. System prompts stay on the server.
export async function GET() {
  return Response.json({
    assistants: ASSISTANTS.map(({ system, ...rest }) => {
      void system;
      return rest;
    }),
  });
}

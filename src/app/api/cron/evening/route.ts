import { isCronAuthorized, runEvening } from "@/features/push/cron";

// 매일 12:00 UTC(한국 21시) — Supabase Cron 이 부른다.
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  return Response.json(await runEvening());
}

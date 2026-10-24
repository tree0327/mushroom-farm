import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/lib/database.types";

// 비밀 키 연결 — RLS 를 건너뛴다. 푸시 발송(구독 읽기·발송 기록)과 예약 작업에서만 쓴다.
// 사용자 요청을 처리하는 코드에서 데이터를 읽고 쓰는 데 쓰지 않는다(권한 검사가 사라진다).
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/shared/lib/database.types";

// 로그인한 사람의 세션으로 DB 에 붙는다. RLS 가 그대로 걸린다. 화면 읽기·서버 액션은 모두 이것을 쓴다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 서버 컴포넌트에서는 쿠키를 못 쓴다. src/proxy.ts 가 세션을 갱신하므로 무시해도 된다.
          }
        },
      },
    },
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인 없이 열리는 주소. 예약 작업 주소는 자기 비밀 헤더로 막는다.
const PUBLIC_PATHS = ["/login", "/api/cron/"];

// 요청마다 세션 토큰을 갱신하고, 로그인 안 했으면 로그인 화면으로 보낸다.
// 여기는 빠른 1차 거름이다. 실제 권한 검사는 서버 액션·화면의 requireMember() 와 DB RLS 가 한다.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
        },
      },
    },
  );

  // createServerClient 와 getClaims 사이에 다른 코드를 넣지 않는다(세션이 엉뚱하게 끊긴다 — Supabase 안내).
  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return supabaseResponse;
}

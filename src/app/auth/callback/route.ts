import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

// 구글 로그인에서 돌아오는 주소. 코드를 세션으로 바꾸고, 등록된 계정이 아니면 바로 로그아웃시킨다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?e=UNKNOWN`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?e=UNKNOWN`);

  // 등록 안 된 계정이면 RLS 가 member 를 0행으로 돌려준다.
  const { data: rows, error: readError } = await supabase.from("mf_member").select("id").limit(1);
  if (readError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?e=UNKNOWN`);
  }
  if (!rows || rows.length === 0) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?e=NOT_MEMBER`);
  }
  return NextResponse.redirect(`${origin}/`);
}

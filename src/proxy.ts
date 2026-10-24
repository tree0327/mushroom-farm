import { type NextRequest } from "next/server";
import { updateSession } from "@/shared/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 정적 파일·서비스 워커·앱 정보 파일은 건너뛴다(홈 화면 앱이 로그인 없이 읽어야 한다).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

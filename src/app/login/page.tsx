import Image from "next/image";
import { Button } from "@/shared/ui/button";
import { messageOf } from "@/shared/messages";
import { signInWithGoogle } from "@/features/member/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const error = e === "NOT_MEMBER" || e === "UNKNOWN" ? messageOf(e) : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-3">
        <Image src="/favicon.svg" alt="" width={72} height={72} priority />
        <h1 className="text-2xl font-bold">버섯재배관리</h1>
        <p className="text-muted-foreground">등록된 구글 계정으로 로그인해 주세요</p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
          {error}
        </p>
      )}
      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="h-12 w-full gap-3 bg-card text-base">
          <GoogleMark />
          구글로 로그인
        </Button>
      </form>
    </main>
  );
}

// 구글 「G」 로고(구글 로그인 버튼 안내의 공식 색)
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

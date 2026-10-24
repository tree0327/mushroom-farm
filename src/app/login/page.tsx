import Image from "next/image";
import { LoginForm } from "@/features/member/components/login-form";
import { messageOf } from "@/shared/messages";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-3">
        <Image src="/favicon.svg" alt="" width={72} height={72} priority />
        <h1 className="text-2xl font-bold">부부 일기</h1>
        <p className="text-muted-foreground">각자 아이디로 로그인해 주세요</p>
      </div>
      {e === "NOT_MEMBER" && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
          {messageOf("NOT_MEMBER")}
        </p>
      )}
      <LoginForm />
    </main>
  );
}

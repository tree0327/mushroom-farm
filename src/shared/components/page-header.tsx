import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

// 화면 위 제목 줄. 아래 탭 화면은 아이폰처럼 큰 제목, back 이 있는 하위 화면은 뒤로 가기 + 작은 제목.
export function PageHeader({ title, back, children }: { title: string; back?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className={cn("mx-auto flex max-w-md items-center gap-1 px-4", back ? "h-14" : "h-18")}>
        {back && (
          <Link href={back} aria-label="뒤로" className="-ml-2 flex size-11 items-center justify-center">
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
        )}
        <h1 className={cn("flex-1", back ? "text-xl font-bold" : "text-[2rem] font-extrabold tracking-tight")}>{title}</h1>
        {children}
      </div>
    </header>
  );
}

// 화면 본문 폭·여백. 아래 탭에 가리지 않게 밑을 띄운다.
export function PageBody({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-2 pb-28">{children}</main>;
}

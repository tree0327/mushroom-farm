import { BottomTabs } from "@/shared/components/bottom-tabs";
import { getMemberOrRedirect } from "@/shared/lib/member";

// 로그인한 회원만 들어오는 화면 묶음. 아래 탭이 붙는다.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await getMemberOrRedirect();
  return (
    <>
      {children}
      <BottomTabs />
    </>
  );
}

import { redirect } from "next/navigation";

// 첫 화면은 기록 탭
export default function Home() {
  redirect("/log");
}

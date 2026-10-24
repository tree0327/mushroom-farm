import { redirect } from "next/navigation";

// 첫 화면은 일기 탭(R12)
export default function Home() {
  redirect("/diary");
}

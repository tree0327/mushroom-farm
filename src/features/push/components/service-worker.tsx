"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 서비스 워커를 등록하고, 앱으로 돌아올 때 화면을 새로 그린다(실시간 연결 대신 — decisions.md 「실시간: 없음」).
export function ServiceWorker() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  return null;
}

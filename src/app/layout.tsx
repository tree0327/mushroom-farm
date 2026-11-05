import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/shared/ui/sonner";
import { ServiceWorker } from "@/features/push/components/service-worker";
import "./globals.css";

// 프리텐다드(가변 굵기 한 파일)를 앱이 직접 내려준다. <html> 의 --font-pretendard 를 globals.css --font-sans 가 쓴다.
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "버섯재배관리",
  description: "버섯 농장 일지와 분석",
  appleWebApp: { capable: true, title: "버섯재배관리", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F6F6F6", // globals.css --background
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 아이폰 노치·홈 막대 영역까지 쓰고 안전 영역은 화면에서 띄운다
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster position="bottom-center" offset={96} mobileOffset={96} duration={3000} />
        <ServiceWorker />
      </body>
    </html>
  );
}

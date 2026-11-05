import type { MetadataRoute } from "next";

// 홈 화면에 추가할 때 쓰는 앱 정보. display: standalone 이어야 아이폰에서 푸시를 받을 수 있다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "버섯재배관리",
    short_name: "버섯재배관리",
    description: "버섯 농장 일지와 분석",
    start_url: "/log",
    scope: "/",
    display: "standalone",
    background_color: "#F6F6F6",
    theme_color: "#F6F6F6",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

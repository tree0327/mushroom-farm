import type { MetadataRoute } from "next";

// 홈 화면에 추가할 때 쓰는 앱 정보. display: standalone 이어야 아이폰에서 푸시를 받을 수 있다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "부부 일기",
    short_name: "부부 일기",
    description: "둘이 쓰는 하루 일기",
    start_url: "/diary",
    scope: "/",
    display: "standalone",
    background_color: "#F4F4F7",
    theme_color: "#F4F4F7",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

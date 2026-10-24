import type { NextConfig } from "next";

// cacheComponents 는 끈다: 일기 공개(다음날 9시)·마감(자정)처럼 매 요청 시각으로 갈리는 화면뿐이고
// 사용자가 둘이라 캐시 이득이 없다. 켜면 세션을 읽는 모든 부분을 Suspense 로 감싸야 한다.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;

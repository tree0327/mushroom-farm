import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 화면 계산은 휴대폰(한국) 시간대로 돈다. 시험도 한국 시간대로 고정한다.
process.env.TZ = "Asia/Seoul";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node" },
});

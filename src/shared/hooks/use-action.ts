"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { messageOf } from "@/shared/messages";
import type { Result } from "@/shared/lib/result";

// 서버 액션 실행 + 누르는 동안 비활성 + 결과 토스트. 화면은 문구를 직접 쓰지 않는다.
export function useAction() {
  const [pending, startTransition] = useTransition();

  function run<T>(action: () => Promise<Result<T>>, opts: { success?: string; onSuccess?: (data: T) => void } = {}) {
    if (pending) return; // 두 번 누름
    startTransition(async () => {
      try {
        const r = await action();
        if (r.ok) {
          if (opts.success) toast.success(opts.success);
          opts.onSuccess?.(r.data);
        } else {
          toast.error(messageOf(r.code));
        }
      } catch {
        // 네트워크 끊김·새 배포로 액션 주소가 바뀐 경우
        toast.error(messageOf("UNKNOWN"));
      }
    });
  }

  return { pending, run };
}

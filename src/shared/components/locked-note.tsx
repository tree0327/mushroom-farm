"use client";

import { Lock } from "lucide-react";
import { toast } from "sonner";
import { messageOf, type MessageCode } from "@/shared/messages";

// 못 하는 동작은 숨기지 않고 잠긴 모양으로 보인다. 누르면 이유를 한 줄로(design.md 6절).
export function LockedNote({ label, reason }: { label: string; reason: MessageCode }) {
  return (
    <button
      type="button"
      onClick={() => toast(messageOf(reason))}
      className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-left text-locked"
    >
      <Lock className="size-4 shrink-0" aria-hidden />
      <span className="text-base">{label}</span>
    </button>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { addDays, formatDayLabel } from "@/shared/lib/date";

// 날짜 이동: 전날 · 날짜(누르면 폰 달력) · 다음날(오늘까지)
export function DayNav({ date, today, go }: { date: string; today: string; go: (date: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" className="size-11" aria-label="전날" onClick={() => go(addDays(date, -1))}>
        <ChevronLeft className="size-6" aria-hidden />
      </Button>
      <label className="relative flex flex-col items-center">
        <span className="text-lg font-semibold">{formatDayLabel(date)}</span>
        <span className="text-sm text-muted-foreground">{date === today ? "오늘" : "날짜를 눌러 바꾸기"}</span>
        {/* 글자 위에 투명한 날짜 칸을 덮어, 누르면 폰 달력이 열린다 */}
        <input
          type="date"
          aria-label="날짜 고르기"
          className="absolute inset-0 opacity-0"
          value={date}
          max={today}
          onChange={(e) => e.target.value && go(e.target.value)}
        />
      </label>
      <Button variant="ghost" className="size-11" aria-label="다음날" disabled={date >= today} onClick={() => go(addDays(date, 1))}>
        <ChevronRight className="size-6" aria-hidden />
      </Button>
    </div>
  );
}

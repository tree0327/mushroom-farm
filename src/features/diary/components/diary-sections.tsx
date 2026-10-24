"use client";

import { CircleCheck, Moon } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { LockedNote } from "@/shared/components/locked-note";
import { formatDayLabel } from "@/shared/lib/date";
import { withTopic } from "@/shared/lib/korean";
import { saveDiary, saveReply } from "@/features/diary/actions";
import type { DiaryScreen } from "@/features/diary/queries";
import { DiaryEditor } from "./diary-editor";

type Names = { me: string; partner: string };

function Body({ text }: { text: string }) {
  return <p className="text-base leading-relaxed whitespace-pre-wrap">{text}</p>;
}

// 어제 상대 일기 + 내 답장 (화면 맨 위)
export function PartnerYesterday({ screen, names }: { screen: DiaryScreen; names: Names }) {
  const s = screen.partnerYesterday;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{names.partner}의 어제 일기</CardTitle>
        <CardDescription>{formatDayLabel(screen.yesterday)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {s.kind === "locked" && <LockedNote label="아침 9시에 열려요" reason={s.reason} />}
        {s.kind === "none" && (
          <p className="text-muted-foreground">{s.restDay ? "어제는 쉬는 날이었어요." : "어제는 일기가 없어요."}</p>
        )}
        {s.kind === "open" && (
          <>
            <Body text={s.entry.body} />
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="font-medium">내 답장</p>
              {s.canReply ? (
                <DiaryEditor
                  key={s.reply?.updatedAt ?? "new"}
                  label="답장"
                  initial={s.reply?.body ?? ""}
                  placeholder="어제 일기에 답장을 남겨 주세요"
                  maxLength={2000}
                  saveAction={(body) => saveReply(s.entry.id, body)}
                />
              ) : s.reply ? (
                <Body text={s.reply.body} />
              ) : (
                <LockedNote label="답장 기간이 지났어요" reason="REPLY_CLOSED" />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 오늘 내 일기
export function MyToday({ screen, names }: { screen: DiaryScreen; names: Names }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">오늘 내 일기</CardTitle>
        <CardDescription>{formatDayLabel(screen.today)} · 자정까지 쓸 수 있어요</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {screen.todayIsRest ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="size-5" aria-hidden />
            <span className="text-base">오늘은 쉬는 날이에요</span>
          </div>
        ) : screen.canWriteToday ? (
          <DiaryEditor
            key={screen.myToday?.updatedAt ?? "new"}
            label="오늘 일기"
            initial={screen.myToday?.body ?? ""}
            placeholder="오늘 하루를 적어 주세요. 내일 아침 9시에 상대에게 보여요."
            maxLength={5000}
            saveAction={(body) => saveDiary(screen.today, body)}
          />
        ) : (
          <LockedNote label="오늘 일기를 쓸 수 없어요" reason="DIARY_CLOSED" />
        )}
        {!screen.todayIsRest && (
          <div className="flex items-center gap-2">
            {screen.partnerWroteToday ? (
              <Badge className="h-7 gap-1 bg-secondary px-3 text-sm text-secondary-foreground">
                <CircleCheck className="size-4" aria-hidden />
                {names.partner}도 오늘 썼어요
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">{withTopic(names.partner)} 아직 안 썼어요</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 내 어제 일기 + 상대 답장
export function MyYesterday({ screen, names }: { screen: DiaryScreen; names: Names }) {
  const s = screen.myYesterday;
  if (s.kind !== "open") return null; // 어제 안 썼으면 칸을 그리지 않는다
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">내 어제 일기</CardTitle>
        <CardDescription>{formatDayLabel(screen.yesterday)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Body text={s.entry.body} />
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="font-medium">{names.partner}의 답장</p>
          {s.reply ? (
            <Body text={s.reply.body} />
          ) : (
            <p className="text-muted-foreground">아직 답장이 없어요.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

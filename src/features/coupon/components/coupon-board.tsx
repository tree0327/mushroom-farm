"use client";

import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Textarea } from "@/shared/ui/textarea";
import { LockedNote } from "@/shared/components/locked-note";
import { useAction } from "@/shared/hooks/use-action";
import { formatDayLabel } from "@/shared/lib/date";
import { completeCoupon, createCoupon, redeemCoupon } from "@/features/coupon/actions";
import type { CouponView } from "@/features/coupon/queries";

const STATUS_LABEL = { issued: "쓸 수 있어요", used: "사용됨", done: "완료" } as const;

function StatusBadge({ c }: { c: CouponView }) {
  if (c.isExpired) return <Badge variant="outline">기간 지남</Badge>;
  return <Badge variant={c.status === "issued" ? "default" : "secondary"}>{STATUS_LABEL[c.status]}</Badge>;
}

function CouponItem({ c, side }: { c: CouponView; side: "received" | "given" }) {
  const { pending, run } = useAction();
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-muted p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-medium">
          <Ticket className="size-5 text-primary" aria-hidden />
          {c.title}
        </p>
        <StatusBadge c={c} />
      </div>
      {c.body && <p className="text-base whitespace-pre-wrap text-muted-foreground">{c.body}</p>}
      {c.expiresOn && <p className="text-sm text-muted-foreground">{formatDayLabel(c.expiresOn)}까지</p>}

      {side === "received" &&
        c.status === "issued" &&
        (c.isExpired ? (
          <LockedNote label="기간이 지나 쓸 수 없어요" reason="COUPON_EXPIRED" />
        ) : (
          <Button className="h-11 text-base" disabled={pending} onClick={() => run(() => redeemCoupon(c.id), { success: "쿠폰을 썼어요" })}>
            사용하기
          </Button>
        ))}
      {side === "received" && c.status === "used" && <p className="text-sm text-muted-foreground">상대가 들어주길 기다리고 있어요.</p>}
      {side === "given" && c.status === "used" && (
        <Button className="h-11 text-base" disabled={pending} onClick={() => run(() => completeCoupon(c.id), { success: "소원을 들어줬어요" })}>
          들어줬어요
        </Button>
      )}
    </li>
  );
}

function CouponList({
  title,
  desc,
  items,
  side,
  empty,
}: {
  title: string;
  desc: string;
  items: CouponView[];
  side: "received" | "given";
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((c) => (
              <CouponItem key={c.id} c={c} side={side} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CouponBoard({
  received,
  given,
  today,
  partnerName,
}: {
  received: CouponView[];
  given: CouponView[];
  today: string;
  partnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresOn, setExpiresOn] = useState("");

  return (
    <>
      <Button className="h-12 text-base" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> {partnerName}에게 쿠폰 만들기
      </Button>

      <CouponList title="받은 쿠폰" desc="[사용하기]를 누르면 상대에게 알림이 가요." items={received} side="received" empty="아직 받은 쿠폰이 없어요." />
      <CouponList title="준 쿠폰" desc="상대가 쓰면 [들어줬어요]를 눌러 주세요." items={given} side="given" empty="아직 준 쿠폰이 없어요." />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader>
            <SheetTitle className="text-lg">소원 쿠폰 만들기</SheetTitle>
            <SheetDescription>만들면 {partnerName}에게 바로 알림이 가요.</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 px-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createCoupon(title, body, expiresOn || null), {
                success: "쿠폰을 줬어요",
                onSuccess: () => {
                  setTitle("");
                  setBody("");
                  setExpiresOn("");
                  setOpen(false);
                },
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="coupon-title">쿠폰 이름</Label>
              <Input
                id="coupon-title"
                className="h-11"
                maxLength={50}
                placeholder="예: 설거지 대신 해 주기"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coupon-body">설명 (선택)</Label>
              <Textarea id="coupon-body" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="coupon-expires">유효기간 (선택 — 비우면 기한 없음)</Label>
              <Input
                id="coupon-expires"
                type="date"
                className="h-11"
                min={today}
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 text-base" disabled={pending || !title.trim()}>
              {pending ? "만드는 중…" : "쿠폰 주기"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

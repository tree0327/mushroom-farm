"use client";

// 옛 매출 화면(SalesScreen·SalesInputModal·SalesRecordModal)을 그대로 옮겼다. 합계는 totals.ts.
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import { cn } from "@/shared/lib/utils";
import { addSale, deleteSale, restoreSale, updateSale } from "@/features/sales/actions";
import {
  buildRecordDateISO,
  groupByMonth,
  localYMD,
  monthTotals,
  thisWeekTotal,
  todayTotal,
  type SalesRecord,
} from "@/features/sales/totals";

type PayType = SalesRecord["type"];
type Filter = "전체" | PayType;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const mdhm = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

type Editing = { mode: "new"; type: PayType } | { mode: "edit"; record: SalesRecord };

export function SalesScreen({ records }: { records: SalesRecord[] }) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  // 합계는 폰 시간대로 센다. 서버(UTC)가 먼저 그린 값과 어긋나지 않게 서버에서는 숫자를 비워 둔다.
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const now = new Date();
  const today = todayTotal(records, now);
  const week = thisWeekTotal(records, now);
  const month = monthTotals(records, now);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button className="h-20 text-xl" onClick={() => setEditing({ mode: "new", type: "현금" })}>
          현금
        </Button>
        <Button variant="outline" className="h-20 text-xl" onClick={() => setEditing({ mode: "new", type: "카드" })}>
          카드
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">오늘 일매출</p>
            <p className="text-xl font-semibold tabular-nums">{isClient ? won(today) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">이번 주 매출{isClient && ` · ${week.rangeLabel}`}</p>
            <p className="text-xl font-semibold tabular-nums">{isClient ? won(week.total) : "—"}</p>
          </CardContent>
        </Card>
      </div>

      <button
        type="button"
        className="flex flex-col gap-1 rounded-xl bg-card p-4 text-left active:bg-muted"
        onClick={() => setMonthOpen(true)}
      >
        <span className="text-sm text-muted-foreground">이번 달 누적 매출{isClient && ` · ${month.label}`}</span>
        <span className="text-2xl font-bold tabular-nums">{isClient ? won(month.total) : "—"}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {isClient ? `현금 ${won(month.cash)} · 카드 ${won(month.card)}` : " "}
        </span>
        <span className="flex items-center text-sm text-primary">
          터치해서 기록 확인 및 수정 <ChevronRight className="size-4" aria-hidden />
        </span>
      </button>

      <Button variant="outline" className="h-12 text-base" onClick={() => setAllOpen(true)}>
        전체 기록 보기
      </Button>

      <Sheet open={monthOpen} onOpenChange={setMonthOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg">이번 달 기록</SheetTitle>
            <SheetDescription>{month.label}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <RecordList items={month.items} onEdit={(record) => setEditing({ mode: "edit", record })} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={allOpen} onOpenChange={setAllOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg">전체 기록</SheetTitle>
            <SheetDescription>달을 누르면 기록이 펼쳐져요.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {records.length === 0 && <p className="text-muted-foreground">아직 기록이 없어요.</p>}
            {groupByMonth(records).map((g) => (
              <details key={g.key} className="rounded-xl bg-muted">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
                  <span className="font-medium">{g.label}</span>
                  <span className="text-right tabular-nums">
                    <span className="block font-semibold">{won(g.total)}</span>
                    <span className="block text-xs text-muted-foreground">
                      현금 {won(g.cash)} · 카드 {won(g.card)}
                    </span>
                  </span>
                </summary>
                <div className="border-t border-background p-3">
                  <RecordList items={g.items} onEdit={(record) => setEditing({ mode: "edit", record })} />
                </div>
              </details>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <SaleInputSheet editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function RecordList({ items, onEdit }: { items: SalesRecord[]; onEdit: (r: SalesRecord) => void }) {
  const [filter, setFilter] = useState<Filter>("전체");
  const shown = filter === "전체" ? items : items.filter((r) => r.type === filter);
  const total = shown.reduce((s, r) => s + r.final, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="결제 방법으로 거르기">
        {(["전체", "현금", "카드"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="h-11 rounded-full px-4"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {shown.length}건 · {won(total)}
      </p>
      {shown.length === 0 ? (
        <p className="text-muted-foreground">기록이 없어요.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {shown.map((r) => (
            <RecordRow key={r.id} r={r} onEdit={() => onEdit(r)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecordRow({ r, onEdit }: { r: SalesRecord; onEdit: () => void }) {
  const { pending, run } = useAction();

  function remove() {
    run(() => deleteSale(r.id), {
      onSuccess: (removed) =>
        toast("기록을 지웠어요", {
          action: {
            label: "실행취소",
            onClick: () =>
              restoreSale(removed)
                .then((res) => (res.ok ? toast.success("되살렸어요") : toast.error(messageOf(res.code))))
                .catch(() => toast.error(messageOf("UNKNOWN"))),
          },
        }),
    });
  }

  return (
    <li className="flex items-center gap-2 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-muted-foreground tabular-nums">{mdhm(r.date)}</span>
        <span className="truncate">{r.name || "—"}</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="flex items-center gap-1.5">
          <Badge variant={r.type === "현금" ? "default" : "secondary"}>{r.type}</Badge>
          <span className="font-semibold tabular-nums">{won(r.final)}</span>
        </span>
        {r.original !== r.final && (
          <span className="text-xs text-muted-foreground tabular-nums">원금 {won(r.original)}</span>
        )}
      </div>
      <Button size="icon" variant="ghost" className="size-11" aria-label="수정" onClick={onEdit}>
        <Pencil aria-hidden />
      </Button>
      <Button size="icon" variant="ghost" className="size-11" aria-label="삭제" disabled={pending} onClick={remove}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

function SaleInputSheet({ editing, onClose }: { editing: Editing | null; onClose: () => void }) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {/* key 로 열 때마다 칸을 새로 채운다 */}
        {editing && (
          <SaleForm
            key={editing.mode === "edit" ? `e${editing.record.id}` : `n${editing.type}`}
            editing={editing}
            onDone={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function SaleForm({ editing, onDone }: { editing: Editing; onDone: () => void }) {
  const rec = editing.mode === "edit" ? editing.record : null;
  const { pending, run } = useAction();
  const [type, setType] = useState<PayType>(rec?.type ?? (editing.mode === "new" ? editing.type : "현금"));
  const [date, setDate] = useState(localYMD(rec?.date ?? new Date()));
  const [name, setName] = useState(rec?.name ?? "");
  const [amountText, setAmountText] = useState(rec ? rec.original.toLocaleString("ko-KR") : "");
  const [error, setError] = useState("");
  const todayYmd = localYMD(new Date());

  function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(amountText.replace(/[^\d]/g, ""));
    if (!amount) {
      setError(messageOf("SALES_AMOUNT"));
      return;
    }
    // 새 기록은 고른 날짜 + 지금 시각, 고칠 때는 원래 시각을 지킨다.
    const payload = { type, amount, name, date: buildRecordDateISO(date, rec?.date ?? null) };
    run(() => (rec ? updateSale(rec.id, payload) : addSale(payload)), {
      success: rec ? "고쳤어요" : `${type} ${won(amount)} 저장했어요`,
      onSuccess: onDone,
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{rec ? "기록 고치기" : `${type} 매출`}</SheetTitle>
        <SheetDescription>금액만 넣으면 돼요.</SheetDescription>
      </SheetHeader>
      <form className="flex flex-col gap-4 px-4" onSubmit={submit}>
        {rec && (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="결제 방법">
            {(["현금", "카드"] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? "default" : "outline"}
                className="h-11"
                aria-pressed={type === t}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="sale-date">날짜</Label>
          <Input
            id="sale-date"
            type="date"
            className="h-11"
            max={todayYmd}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sale-name">고객명/메모 (선택)</Label>
          <Input id="sale-name" className="h-11" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sale-amount">금액</Label>
          <Input
            id="sale-amount"
            inputMode="numeric"
            autoComplete="off"
            className={cn("h-12 text-right text-xl tabular-nums", error && "border-destructive")}
            placeholder="0"
            value={amountText}
            aria-invalid={!!error}
            aria-describedby={error ? "sale-amount-error" : undefined}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 9);
              setAmountText(digits ? Number(digits).toLocaleString("ko-KR") : "");
              setError("");
            }}
            autoFocus={!rec}
          />
          {error && (
            <p id="sale-amount-error" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" className="h-12 text-base" disabled={pending}>
          {pending ? "저장하는 중…" : "저장"}
        </Button>
      </form>
    </>
  );
}

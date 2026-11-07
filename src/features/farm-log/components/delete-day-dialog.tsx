"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { formatDayLabel } from "@/shared/lib/date";

export function DeleteDayDialog({
  date,
  open,
  onOpenChange,
  onConfirm,
}: {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{formatDayLabel(date)} 기록을 지울까요?</AlertDialogTitle>
          <AlertDialogDescription>농장·호실 항목과 메모가 모두 지워지고 되돌릴 수 없어요.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">그만두기</AlertDialogCancel>
          <AlertDialogAction className="h-11" variant="destructive" onClick={onConfirm}>
            지우기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

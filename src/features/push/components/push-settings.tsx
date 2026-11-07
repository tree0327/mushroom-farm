"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { useAction } from "@/shared/hooks/use-action";
import { messageOf } from "@/shared/messages";
import { sendTestPush, subscribePush } from "@/features/push/actions";
import { InstallGuide } from "@/features/push/components/install-guide";

type State = "checking" | "need-install" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

async function detect(): Promise<State> {
  // 아이폰은 홈 화면에 추가한 앱에서만 푸시가 된다(iOS 16.4+)
  if (isIOS() && !isStandalone()) return "need-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export function PushSettings() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const test = useAction();

  useEffect(() => {
    detect().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      // 권한 요청은 버튼을 누른 그 순간에 해야 아이폰이 받아 준다
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        toast.error(messageOf("PUSH_DENIED"));
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        }));
      const r = await subscribePush(sub.toJSON());
      if (!r.ok) {
        toast.error(messageOf(r.code));
        return;
      }
      setState("on");
      toast.success("알림을 켰어요");
    } catch {
      toast.error(messageOf("PUSH_UNSUPPORTED"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">알림</CardTitle>
        <CardDescription>켜 두면 나중에 붙일 알림(예: 기록 안 한 날)을 이 폰으로 받아요. 지금은 시험 알림만 보낼 수 있어요.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state === "checking" && <p className="text-muted-foreground">확인 중…</p>}

        {state === "need-install" && <InstallGuide />}

        {state === "unsupported" && <p className="text-base">{messageOf("PUSH_UNSUPPORTED")}</p>}

        {state === "denied" && <p className="text-base">{messageOf("PUSH_DENIED")}</p>}

        {state === "off" && (
          <Button className="h-11 text-base" onClick={turnOn} disabled={busy}>
            <Bell aria-hidden /> {busy ? "켜는 중…" : "알림 켜기"}
          </Button>
        )}

        {state === "on" && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-base">
              <BellRing className="size-5 text-primary" aria-hidden /> 이 기기로 알림이 와요.
            </p>
            <Button
              variant="outline"
              className="h-11 text-base"
              disabled={test.pending}
              onClick={() =>
                test.run(() => sendTestPush(), {
                  onSuccess: (outcome) =>
                    outcome === "sent"
                      ? toast.success("시험 알림을 보냈어요")
                      : outcome === "duplicate"
                        ? toast("방금 보냈어요. 1분 뒤에 다시 해 주세요.")
                        : toast.error(messageOf("UNKNOWN")),
                })
              }
            >
              시험 알림 보내기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

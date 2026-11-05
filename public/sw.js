// 서비스 워커 — 앱이 닫혀 있어도 푸시를 받아 알림으로 띄운다.
// 오프라인 캐시는 하지 않는다(늘 서버에서 새로 그리는 앱이라).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "부부 일기", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "부부 일기", {
      body: data.body || "",
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      tag: data.tag,
      data: { url: data.url || "/log" },
    }),
  );
});

// 알림을 누르면 열려 있는 창을 그 화면으로, 없으면 새로 연다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/log", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

/* JDPINTO — Service Worker: notificações push em segundo plano */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Nova intervenção JDPINTO",
    body: "Tens uma nova tarefa atribuída.",
    url: "/tech",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.url || "jdpinto-task",
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || "/tech" },
      vibrate: [200, 80, 200, 80, 400],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/tech";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "SHOW_NOTIFICATION") return;

  event.waitUntil(
    self.registration.showNotification(msg.title || "JDPINTO", {
      body: msg.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: msg.tag || "jdpinto-task",
      renotify: true,
      requireInteraction: true,
      data: { url: msg.url || "/tech" },
      vibrate: [200, 80, 200, 80, 400],
    }),
  );
});

/* SnipeTag static PWA service worker — offline shell + Web Push. */
const params = new URL(self.location.href).searchParams;
const API_BASE = (params.get("api") || "").replace(/\/$/, "");
const CACHE = "snipetag-static-v1";
const BASE = new URL("./", self.location.href).href;
const shell = (p) => new URL(p, BASE).href;
const APP_SHELL = [shell(""), shell("index.html"), shell("manifest.json"), shell("icons/icon-192.png")];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || caches.match(shell("index.html"))));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })),
  );
});

/* Web Push: message content is looked up from the Worker by subscription endpoint,
   so no E2E-encrypted payload is required. */
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let message = { title: "SnipeTag", body: "A snipe just triggered.", url: shell("alerts") };
    try {
      const subscription = await self.registration.pushManager.getSubscription();
      if (subscription && API_BASE) {
        const response = await fetch(`${API_BASE}/api/push/message?endpoint=${encodeURIComponent(subscription.endpoint)}`);
        if (response.ok) {
          const data = await response.json();
          message = { ...message, ...data, url: data.url || message.url };
        }
      }
    } catch { /* show the default notification */ }
    await self.registration.showNotification(message.title, {
      body: message.body,
      icon: shell("icons/icon-192.png"),
      badge: shell("icons/icon-192.png"),
      tag: `snipetag-${message.url}`,
      data: { url: message.url },
      actions: [{ action: "open", title: "View alert" }],
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || shell("alerts"), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

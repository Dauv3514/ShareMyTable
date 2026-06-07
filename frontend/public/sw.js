const OFFLINE_CACHE_NAME = "ramene-ta-poire-offline-v2";
const OFFLINE_URL = "/offline.html";
const OFFLINE_ASSETS = [OFFLINE_URL, "/icons/icon-192.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE_NAME)
      .then((cache) =>
        Promise.all(
          OFFLINE_ASSETS.map((assetUrl) =>
            cache.add(assetUrl).catch(() => undefined),
          ),
        ),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("ramene-ta-poire-offline-") &&
                cacheName !== OFFLINE_CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then(
        (response) =>
          response ??
          new Response("Connexion Internet requise.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ),
    ),
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Ramène Ta Poire",
    body: "Vous avez une nouvelle notification.",
    url: "/",
  };

  if (event.data) {
    try {
      payload = {
        ...payload,
        ...event.data.json(),
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/maskable-192.png",
    tag: payload.tag,
    data: {
      ...(payload.data ?? {}),
      url: payload.url ?? "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url ?? "/", self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin === targetUrl.origin && "focus" in client) {
            client.navigate(targetUrl.href);
            return client.focus();
          }
        }

        return self.clients.openWindow(targetUrl.href);
      }),
  );
});

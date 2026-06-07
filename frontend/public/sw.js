self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Le service worker reste volontairement neutre pour ne pas mettre en cache
  // des pages dynamiques pendant le développement.
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

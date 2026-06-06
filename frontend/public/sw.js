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

// Bump this version to force the cache to refresh after a deploy.
const CACHE = "planner-v16";

// App shell — files needed to render the UI offline. Firebase SDK and task
// data are network-first (handled below), not precached.
const SHELL = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "firebase-config.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Fetch each shell file network-fresh so a stale HTTP-cache copy (e.g. an
      // out-of-date firebase-config.js) can never get baked into the cache.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle same-origin GETs. Firebase/Firestore is cross-origin and must
  // always hit the network, so it falls through untouched.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Stale-while-revalidate: serve cache instantly, refresh in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Incoming push from the cloud scheduler -> show a notification even when the
// app is fully closed.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Reminder", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Reminder";
  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "." },
    renotify: !!data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping a reminder notification focuses (or opens) the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || ".";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

const CACHE_NAME = "daily-kopi-pos-v39";
const filesToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./splash.css",
  "./app.js",
  "./manifest.json",
  "./assets/logo POS kasir.png",
  "./assets/logo matcha bee.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(filesToCache)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(response => response || fetch(event.request)))
  );
});

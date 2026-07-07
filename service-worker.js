const CACHE_NAME = "daily-kopi-pos-v63";
const filesToCache = [
  "./",
  "./index.html",
  "./assets/css/style.css",
  "./assets/css/splash.css",
  "./assets/css/animations.css",
  "./assets/js/app.js",
  "./assets/js/enhance.js",
  "./manifest.json",
  "./assets/images/app-icon-192.png",
  "./assets/images/app-icon-512.png",
  "./assets/images/app-icon-maskable-512.png",
  "./assets/images/logo-matcha-bee.jpg"
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

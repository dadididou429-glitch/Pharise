// Pharis Service Worker — v9 (fast update)
// غيّر رقم الإصدار عند كل تحديث ليفرض التحديث فورًا
const CACHE_NAME = "pharis-v12";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

const EXTERNAL = [
  "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone@7.25.6/babel.min.js",
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (event) => {
  // تثبيت فوري بدون انتظار
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        [...SHELL, ...EXTERNAL].map((url) =>
          cache.add(url).catch((err) => console.warn("[SW] skip", url, err))
        )
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // حذف كل الكاش القديم فورًا
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      // السيطرة على كل التبويبات فورًا
      await self.clients.claim();
      // إخبار كل الصفحات أن هناك تحديث جديد
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        client.postMessage({ type: "SW_UPDATED", version: CACHE_NAME });
      });
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  const isAPI =
    url.hostname.includes("overpass") ||
    url.hostname.includes("nominatim") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("openstreetmap") ||
    url.hostname.includes("tile") ||
    url.hostname.includes("ipapi");

  // APIs: شبكة أولاً دائمًا
  if (isAPI) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // index.html و service-worker: شبكة أولاً ثم كاش (تحديث سريع)
  const isCritical =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("service-worker.js") ||
    url.pathname.endsWith("manifest.json");

  if (isCritical) {
    event.respondWith(
      fetch(event.request)
        .then(async (res) => {
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, res.clone());
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // باقي الملفات: كاش أولاً ثم تحديث في الخلفية
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);

      const fetchPromise = fetch(event.request)
        .then(async (res) => {
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            if (
              url.origin === self.location.origin ||
              EXTERNAL.some((e) => event.request.url.startsWith(e.split("?")[0]))
            ) {
              cache.put(event.request, res.clone());
            }
          }
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })()
  );
});

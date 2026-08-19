const CACHE_NAME = 'pharis-v54-clean';
const urlsToCache = ['./','./index.html','./pharmacies.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(urlsToCache);
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.filter(function(name) {
      return name !== CACHE_NAME;
    }).map(function(name) {
      return caches.delete(name);
    }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(caches.match(event.request).then(function(response) {
    if (response) return response;
    return fetch(event.request).then(function(response) {
      if (!response || response.status !== 200 || response.type !== 'basic') return response;
      var responseToCache = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, responseToCache);
      });
      return response;
    });
  }));
});

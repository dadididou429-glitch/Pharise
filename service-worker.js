const CACHE_NAME='pharis-pro-v1';
const urlsToCache=['./','./index.html','./pharmacies.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))));self.clients.claim()});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(r2=>{if(!r2||r2.status!==200||r2.type!=='basic')return r2;var rc=r2.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,rc));return r2})))});

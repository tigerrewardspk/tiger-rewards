const CACHE_NAME = 'tiger-rewards-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/monogram.png', '/avatar.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Tiger Rewards', body: 'You have a new notification!' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: ICON_URL,
    badge: ICON_URL,
    tag: data.tag || 'tiger-rewards'
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(cs => {
    if (cs.length) cs[0].focus();
    else clients.openWindow('/');
  }));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: ICON_URL,
      badge: ICON_URL,
      tag: 'tiger-' + Date.now()
    });
  }
});
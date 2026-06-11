const CACHE_NAME = 'ucab-ecommerce-v1';
const ASSETS = [
  'index.html',
  'styles.css',
  'script.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // Avoid caching Chrome extensions or external API calls dynamically
    const isLocalRequest = event.request.url.startsWith(self.location.origin);
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Stale-while-revalidate for local assets
                    if (isLocalRequest) {
                        fetch(event.request).then(networkResponse => {
                            if (networkResponse.status === 200) {
                                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                            }
                        }).catch(() => {/* Ignore offline network errors */});
                    }
                    return cachedResponse;
                }
                
                return fetch(event.request).then(response => {
                    if (response.status === 200 && isLocalRequest) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    }
                    return response;
                });
            })
    );
});

const CACHE_NAME = 'upn-card-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Also cache Google Fonts
const FONT_URLS = [
    'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800;1,900&display=swap'
];

// Install: cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Cache local assets first
            return cache.addAll(ASSETS).then(() => {
                // Try to cache fonts (non-blocking)
                return Promise.allSettled(
                    FONT_URLS.map(url =>
                        fetch(url).then(response => {
                            if (response.ok) {
                                cache.put(url, response.clone());
                                // Parse CSS to find font file URLs and cache them too
                                return response.text().then(css => {
                                    const fontFileUrls = css.match(/url\(([^)]+)\)/g);
                                    if (fontFileUrls) {
                                        const urls = fontFileUrls.map(u =>
                                            u.replace(/url\((['"]?)/, '').replace(/['"]?\)$/, '')
                                        );
                                        return Promise.allSettled(
                                            urls.map(u => fetch(u).then(r => {
                                                if (r.ok) cache.put(u, r);
                                            }))
                                        );
                                    }
                                });
                            }
                        }).catch(() => {})
                    )
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Cache successful responses
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

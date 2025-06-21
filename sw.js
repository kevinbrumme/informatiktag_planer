const CACHE_NAME = 'univent-v1.0.0';
const STATIC_CACHE = 'univent-static-v1';
const API_CACHE = 'univent-api-v1';

// Assets die immer gecacht werden sollen
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/js/app.js',
    '/assets/favicon.png',
    '/assets/logo-uni.png',
    '/assets/floorplan.png',
    'https://cdn.tailwindcss.com'
];

// API-Endpunkte die gecacht werden sollen
const API_ENDPOINTS = [
    '/data/events.json',
    '/data/theme.json',
    '/data/i18n/de.json',
    '/data/i18n/en.json',
    '/data/i18n/fr.json'
];

// Service Worker Installation
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker');

    event.waitUntil(
        Promise.all([
            // Statische Assets cachen
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),

            // API-Daten cachen
            caches.open(API_CACHE).then(cache => {
                console.log('[SW] Caching API data');
                return Promise.allSettled(
                    API_ENDPOINTS.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(err => {
                                console.log(`[SW] Failed to cache ${url}:`, err);
                            });
                    })
                );
            })
        ]).then(() => {
            console.log('[SW] Installation complete');
            // Sofort aktivieren
            return self.skipWaiting();
        })
    );
});

// Service Worker Aktivierung
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker');

    event.waitUntil(
        Promise.all([
            // Alte Caches löschen
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),

            // Alle Clients übernehmen
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Activation complete');
        })
    );
});

// Fetch-Events abfangen
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Nur GET-Requests cachen
    if (request.method !== 'GET') {
        return;
    }

    // Verschiedene Cache-Strategien je nach Request-Typ
    if (isStaticAsset(request.url)) {
        // Cache First für statische Assets
        event.respondWith(handleStaticAsset(request));
    } else if (isApiRequest(request.url)) {
        // Network First für API-Daten
        event.respondWith(handleApiRequest(request));
    } else if (isNavigationRequest(request)) {
        // Navigation Requests → immer index.html
        event.respondWith(handleNavigation(request));
    }
});

// Prüfen ob statisches Asset
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => url.includes(asset)) ||
        url.includes('.png') ||
        url.includes('.jpg') ||
        url.includes('.svg') ||
        url.includes('.css') ||
        url.includes('.js') ||
        url.includes('tailwindcss.com');
}

// Prüfen ob API-Request
function isApiRequest(url) {
    return url.includes('/data/') || API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

// Prüfen ob Navigation-Request
function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Cache First Strategie für statische Assets
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;

    } catch (error) {
        console.log('[SW] Static asset fetch failed:', error);
        return caches.match(request);
    }
}

// Network First Strategie für API-Daten
async function handleApiRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        throw new Error('Network response not ok');

    } catch (error) {
        console.log('[SW] API request failed, serving from cache:', error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback für fehlende Übersetzungen
        if (request.url.includes('/data/i18n/')) {
            return new Response('{}', {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        throw error;
    }
}

// Navigation Requests → immer index.html
async function handleNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('[SW] Navigation failed, serving cached index.html');
        const cachedResponse = await caches.match('/index.html') || await caches.match('/');
        return cachedResponse || new Response('App offline', { status: 503 });
    }
}

// Hintergrund-Sync für Updates
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('[SW] Background sync triggered');
        event.waitUntil(updateCaches());
    }
});

// Caches aktualisieren
async function updateCaches() {
    try {
        const apiCache = await caches.open(API_CACHE);

        // API-Daten im Hintergrund aktualisieren
        const updatePromises = API_ENDPOINTS.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await apiCache.put(url, response);
                    console.log(`[SW] Updated cache for ${url}`);
                }
            } catch (error) {
                console.log(`[SW] Failed to update ${url}:`, error);
            }
        });

        await Promise.allSettled(updatePromises);

        // Clients über Updates benachrichtigen
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'CACHE_UPDATED' });
        });

    } catch (error) {
        console.log('[SW] Cache update failed:', error);
    }
} 
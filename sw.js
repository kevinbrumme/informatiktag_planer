// Development-Modus erkennen
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port;

const CACHE_NAME = isDevelopment ? 'informatiktag-dev' : 'informatiktag-v1.0.6';
const STATIC_CACHE = isDevelopment ? 'informatiktag-static-dev' : 'informatiktag-static-v10';
const API_CACHE = isDevelopment ? 'informatiktag-api-dev' : 'informatiktag-api-v10';

// Assets die immer gecacht werden sollen
const STATIC_ASSETS = [
    '/',
    'index.html',
    'js/app.js',
    // CSS und Icons (lokal)
    'assets/css/style.css',
    'assets/icons/regular/style.css',
    'assets/icons/fill/style.css',
    // Alle Bilder und Icons
    'assets/favicon.png',
    'assets/logo_uni_oldenburg_it_department_white.png',
    'assets/logo_uni_oldenburg_it_department.png',
    'assets/logo-infoday.png',
    'assets/floorplan.png',
    'assets/background_gradient.svg',
    // Lokale Fonts
    'assets/fonts/JetBrainsMono-Regular.ttf',
    'assets/fonts/JetBrainsMono-Bold.ttf',
    'assets/fonts/NotoSans-Regular.ttf',
    'assets/fonts/NotoSans-Bold.ttf',
    // Icon Fonts
    'assets/icons/regular/Phosphor.woff2',
    'assets/icons/regular/Phosphor.woff',
    'assets/icons/regular/Phosphor.ttf',
    'assets/icons/fill/Phosphor-Fill.woff2',
    'assets/icons/fill/Phosphor-Fill.woff',
    'assets/icons/fill/Phosphor-Fill.ttf'
];

// API-Endpunkte die gecacht werden sollen
const API_ENDPOINTS = [
    'data/events.json',
    'data/theme.json',
    'data/i18n/de.json',
    'data/stations.json',
    'data/legend.json'
];

// Service Worker Installation
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker');

    event.waitUntil(
        Promise.all([
            // Statische Assets cachen
            caches.open(STATIC_CACHE).then(async cache => {
                console.log('[SW] Caching static assets');

                // Alle Assets sind jetzt lokal - keine externen Assets mehr
                const localAssets = STATIC_ASSETS;

                // Lokale Assets (kritisch - müssen funktionieren)
                for (const asset of localAssets) {
                    try {
                        const response = await fetch(asset);
                        if (response.ok) {
                            await cache.put(asset, response);
                            console.log('[SW] Cached local asset:', asset);
                        } else {
                            console.error('[SW] Failed to fetch local asset:', asset, response.status);
                        }
                    } catch (err) {
                        console.error('[SW] Error caching local asset:', asset, err);
                    }
                }

                // Keine externen Assets mehr - alles ist lokal

                // Lokale Fonts werden über CSS automatisch geladen - keine externe Font-Verarbeitung nötig

                return cache;
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
        ]).then(async () => {
            // Prüfen ob kritische Assets gecacht wurden
            const cache = await caches.open(STATIC_CACHE);
            const criticalAssets = ['assets/floorplan.png', 'assets/logo_uni_oldenburg_it_department.png', 'assets/favicon.png'];

            for (const asset of criticalAssets) {
                const cached = await cache.match(asset);
                if (cached) {
                    console.log('[SW] ✅ Critical asset cached:', asset);
                } else {
                    console.error('[SW] ❌ Critical asset NOT cached:', asset);
                }
            }

            console.log('[SW] Installation complete - All assets cached for offline use');

            // Clients über neue Version informieren
            notifyClientsAboutUpdate('new-version-available');

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

            // Clients über erfolgreiche Aktivierung informieren
            notifyClientsAboutUpdate('update-ready');
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
        url.includes('.jpeg') ||
        url.includes('.svg') ||
        url.includes('.ico') ||
        url.includes('.webp') ||
        url.includes('.css') ||
        url.includes('.js') ||
        url.includes('.woff') ||
        url.includes('.woff2') ||
        url.includes('.ttf');
}

// Prüfen ob API-Request
function isApiRequest(url) {
    return url.includes('data/') || API_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

// Prüfen ob Navigation-Request
function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Cache First Strategie für statische Assets
async function handleStaticAsset(request) {
    // Im Development-Modus: Network First für HTML/JS/CSS
    if (isDevelopment && (request.url.includes('.html') || request.url.includes('.js') || request.url.includes('.css'))) {
        try {
            console.log('[SW] Development mode - Network first for:', request.url);
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                const cache = await caches.open(STATIC_CACHE);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            console.log('[SW] Network failed, trying cache:', request.url);
            return caches.match(request);
        }
    }

    // Standard Cache First für Bilder und Production
    try {
        // Erst im Cache suchen
        const cachedResponse = await caches.match(request);
        if (cachedResponse && !isDevelopment) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }

        // Wenn nicht im Cache oder Development, versuche aus Netzwerk zu laden
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
            console.log('[SW] Cached new asset:', request.url);
        }
        return networkResponse;

    } catch (error) {
        console.log('[SW] Static asset fetch failed:', request.url, error);

        // Als letzter Ausweg: nochmal im Cache suchen
        const fallbackResponse = await caches.match(request);
        if (fallbackResponse) {
            console.log('[SW] Serving fallback from cache:', request.url);
            return fallbackResponse;
        }

        // Wenn gar nichts funktioniert
        console.error('[SW] Asset not available offline:', request.url);
        return new Response('Asset not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
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
        if (request.url.includes('data/i18n/')) {
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
        const cachedResponse = await caches.match('index.html') || await caches.match('/');
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

// Message-Handler für Kommunikation mit der App
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting requested');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION_INFO',
            version: CACHE_NAME
        });
    }
});

// Hilfsfunktion zum Benachrichtigen der Clients
async function notifyClientsAboutUpdate(updateType) {
    try {
        const clients = await self.clients.matchAll({
            includeUncontrolled: true,
            type: 'window'
        });

        console.log(`[SW] Notifying ${clients.length} clients about: ${updateType}`);

        clients.forEach(client => {
            client.postMessage({
                type: updateType,
                version: CACHE_NAME,
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.log('[SW] Failed to notify clients:', error);
    }
} 
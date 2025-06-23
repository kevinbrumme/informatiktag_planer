// Globale Variablen
let currentLanguage = 'de';
let currentSection = 'agenda';
let translations = {};
let events = [];
let theme = {};
let availableLanguages = [];
let stations = [];
let letterStations = [];
let stationsColor = '#45B7D1';
let legend = [];

let serviceWorkerRegistration = null;

// Debug-Funktion für Cache-Inhalt
async function debugCache() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[Debug] Available caches:', cacheNames);

        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            console.log(`[Debug] Cache ${cacheName} contains:`, requests.map(r => r.url));
        }
    }
}

// Development-Funktion: Cache leeren
async function clearCache() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[Dev] All caches cleared');
        window.location.reload();
    }
}

// Development-Modus erkennen
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port;

// Globale Funktionen für Development
if (isDevelopment) {
    window.clearCache = clearCache;
    window.debugCache = debugCache;
    console.log('[Dev] Development mode detected. Use clearCache() or debugCache() in console.');
}

// App initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    // Service Worker registrieren
    await registerServiceWorker();

    // Debug: Cache-Inhalt nach 2 Sekunden prüfen
    setTimeout(debugCache, 2000);



    // Scroll-Header initialisieren
    initializeScrollHeader();

    await detectAvailableLanguages();
    await loadTranslations();
    await loadEvents();
    await loadTheme();
    await loadStations();
    await loadLegend();

    initializeNavigation();
    initializeLanguageSelector();
    updateLanguage();
    showSection('agenda');

    // Initial Navigation Indicator positionieren
    const firstNavItem = document.getElementById('nav-agenda');
    if (firstNavItem) {
        updateNavIndicator(firstNavItem);
    }

    // Regelmäßig nach Updates suchen (alle 5 Minuten)
    setInterval(checkForUpdates, 5 * 60 * 1000);

    // Auch beim Focus der App nach Updates suchen
    window.addEventListener('focus', checkForUpdates);
});

// Verfügbare Sprachen erkennen
async function detectAvailableLanguages() {
    // Nur Deutsch verwenden
    availableLanguages = [
        { code: 'de', name: '🇩🇪 DE', file: 'de.json' }
    ];

    // Prüfen ob de.json verfügbar ist
    try {
        const response = await fetch('data/i18n/de.json', { method: 'HEAD' });
        if (response.ok) {
            currentLanguage = 'de';
            console.log('Deutsche Sprache verfügbar');
        } else {
            console.warn('Deutsche Sprachdatei nicht gefunden');
        }
    } catch (error) {
        console.warn('Fehler beim Prüfen der deutschen Sprachdatei:', error);
    }
}

// Übersetzungen laden
async function loadTranslations() {
    try {
        const response = await fetch(`data/i18n/${currentLanguage}.json`);
        if (response.ok) {
            translations = await response.json();
        } else {
            console.error('Übersetzungsdatei nicht gefunden:', currentLanguage);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Übersetzungen:', error);
    }
}

// Events laden
async function loadEvents() {
    try {
        const response = await fetch('data/events.json');
        events = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
    }
}

// Theme laden
async function loadTheme() {
    try {
        const response = await fetch('data/theme.json');
        theme = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden des Themes:', error);
    }
}

// Stationen laden
async function loadStations() {
    try {
        const response = await fetch('data/stations.json');
        const stationsData = await response.json();
        stations = stationsData.stations || stationsData; // Rückwärtskompatibilität
        letterStations = stationsData.letterStations || []; // Buchstaben-Stationen
        stationsColor = stationsData.color || '#45B7D1'; // Standardfarbe falls nicht definiert
    } catch (error) {
        console.error('Fehler beim Laden der Stationen:', error);
    }
}

// Legende laden
async function loadLegend() {
    try {
        const response = await fetch('data/legend.json');
        legend = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Legende:', error);
    }
}

// Navigation initialisieren
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.id.replace('nav-', '');
            showSection(section);
            updateActiveNavButton(button);
        });
    });
}

// Aktive Navigation aktualisieren
function updateActiveNavButton(activeButton) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');

        // Alle Icons auf outline setzen
        const outlineIcon = btn.querySelector('.icon-outline');
        const filledIcon = btn.querySelector('.icon-filled');
        if (outlineIcon && filledIcon) {
            outlineIcon.classList.remove('hidden');
            filledIcon.classList.add('hidden');
        }
    });

    activeButton.classList.add('active');

    // Aktives Icon auf filled setzen
    const activeOutlineIcon = activeButton.querySelector('.icon-outline');
    const activeFilledIcon = activeButton.querySelector('.icon-filled');
    if (activeOutlineIcon && activeFilledIcon) {
        activeOutlineIcon.classList.add('hidden');
        activeFilledIcon.classList.remove('hidden');
    }

    // Animierte Linie bewegen
    updateNavIndicator(activeButton);
}

// Navigation Indicator bewegen
function updateNavIndicator(activeButton) {
    const indicator = document.getElementById('nav-indicator');
    const navContainer = activeButton.parentElement;

    if (!indicator || !activeButton || !navContainer) return;

    // Button-Position ermitteln
    const buttonRect = activeButton.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();

    // Relative Position des Buttons innerhalb des Containers
    const buttonLeft = buttonRect.left - containerRect.left;
    const buttonWidth = buttonRect.width;

    // Kreis zentriert unter dem Button positionieren
    const buttonCenterX = buttonLeft + (buttonWidth / 2);
    const circleWidth = 360;
    const circleLeft = buttonCenterX - (circleWidth / 2); // Perfekt zentriert

    // Kreis positionieren - Größe bleibt im CSS definiert
    indicator.style.left = `${circleLeft}px`;
    indicator.style.transform = 'none';
    // width und height werden NICHT gesetzt - bleiben im CSS
}

// Sprachwechsel initialisieren
function initializeLanguageSelector() {
    const languageSelect = document.getElementById('languageSelect');
    const headerTop = document.getElementById('headerTop');

    // Wenn nur eine Sprache verfügbar ist, Logo bleibt zentriert (Standard)
    if (availableLanguages.length <= 1) {
        // Selectbox bleibt versteckt (ist bereits hidden im HTML)
        // Logo bleibt zentriert (ist bereits justify-center im HTML)
        return;
    }

    // Mehrere Sprachen vorhanden - Selectbox einblenden und Layout ändern
    languageSelect.classList.remove('hidden');
    headerTop.classList.remove('justify-center');
    headerTop.classList.add('justify-between');

    // Selectbox mit verfügbaren Sprachen füllen
    languageSelect.innerHTML = '';
    availableLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        languageSelect.appendChild(option);
    });

    languageSelect.addEventListener('change', async (e) => {
        currentLanguage = e.target.value;
        await loadTranslations();
        updateLanguage();
        showSection(currentSection);
    });

    // Aktuelle Sprache setzen
    languageSelect.value = currentLanguage;
}

// Sprache aktualisieren
function updateLanguage() {
    // Header aktualisieren
    const headerTitle = document.getElementById('headerTitle');
    const titleText = translations.eventTitle || 'ZUKUNFT IST JETZT';
    headerTitle.textContent = titleText;

    // Navigation aktualisieren
    const navAgenda = document.querySelector('#nav-agenda span');
    const navMap = document.querySelector('#nav-map span');
    const navInfo = document.querySelector('#nav-info span');

    if (navAgenda) navAgenda.textContent = (translations.agenda || 'AGENDA').toUpperCase();
    if (navMap) navMap.textContent = (translations.map || 'PLAN').toUpperCase();
    if (navInfo) navInfo.textContent = 'INFO';

    // Seiten-Titel aktualisieren
    document.title = `${translations.eventTitle || 'Informatiktag 2025'}`;
}

// Sektion anzeigen
function showSection(section) {
    currentSection = section;
    const mainContent = document.getElementById('mainContent');

    // Aktive Navigation setzen
    const activeButton = document.getElementById(`nav-${section}`);
    if (activeButton) {
        updateActiveNavButton(activeButton);
    }

    // Sofort nach oben scrollen
    window.scrollTo(0, 0);

    // Fade-out Animation
    mainContent.style.transition = 'opacity 0.1s ease';
    mainContent.style.opacity = '0';

    setTimeout(() => {
        // Content laden nach dem Fade-out
        switch (section) {
            case 'agenda':
                mainContent.innerHTML = renderAgenda();
                break;
            case 'map':
                mainContent.innerHTML = renderMap();
                // Map-Interaktion nach dem Rendern initialisieren
                setTimeout(() => initializeMapInteraction(), 100);
                break;

            case 'info':
                mainContent.innerHTML = renderInfo();
                break;
            default:
                mainContent.innerHTML = renderAgenda();
        }

        // Fade-in Animation
        mainContent.style.opacity = '1';
    }, 100);
}

// Kategorie-Farben definieren (mit 20% Opacity)
function getCategoryColor(category) {
    const categoryColors = {
        'Vorlesung': 'rgba(0, 170, 217, 0.2)',   // Blau mit 20% Opacity
        'Workshop': 'rgba(201, 212, 0, 0.2)',    // Grün mit 20% Opacity
        'Tour': 'rgba(242, 145, 0, 0.2)',     // Orange mit 20% Opacity
        'Quiz': 'rgba(212, 57, 11, 0.2)'         // Rot mit 20% Opacity
    };

    return categoryColors[category] || 'rgba(102, 102, 102, 0.2)'; // Fallback Grau mit 20% Opacity
}

// Agenda-Ansicht rendern
function renderAgenda() {
    return `
        <div>
            <div class="space-y-4">
                ${events.map(event => {
        // Kategorie direkt verwenden (keine Übersetzung)
        const categoryText = event.category ? event.category.toUpperCase() : '';
        const categoryColor = event.category ? getCategoryColor(event.category) : '';

        return `
                    <div class="event-card shadow-tech pt-2 pb-0 relative">
                        <!-- Event Type Badge rechts oben (nur wenn Kategorie vorhanden) -->
                        ${categoryText && event.category ? `
                            <span class="event-type-badge" style="background-color: ${categoryColor}; color: #003c61;">
                                ${categoryText}
                            </span>
                        ` : ''}
                        
                        <!-- Zeit-Badge links oben -->
                        <div class="mb-2 px-4">
                            <span class="time-badge text-xs">
                                ${event.start} - ${event.end} ${translations.clock}
                            </span>
                        </div>
                        
                        <!-- Titel -->
                        <h3 class="mono text-lg px-4">${event.title}</h3>
                        
                        <!-- Beschreibung -->
                        <p class="text-sm mb-3 px-4 mt-1">${event.description}</p>
                        
                        <!-- Referent (falls vorhanden) -->
                        ${event.speaker ? `<p class="text-xs mono mb-3 px-4">REFERENT: ${event.speaker}</p>` : ''}
                        
                        <!-- Trennlinie -->
                        <div class="event-separator mb-1"></div>
                        
                        <!-- Ort-Badge unten -->
                        <div class="px-4 pb-2">
                            <span class="location-badge text-xs">
                                ${event.location}
                            </span>
                        </div>
                    </div>
                `;
    }).join('')}
            </div>
        </div>
    `;
}

// Karten-Ansicht rendern
function renderMap() {

    return `
        <div>
            <!-- Gebäudeplan -->
            <div class="map-container shadow-tech mb-6 rounded-xl bg-white overflow-hidden">
                <div class="relative rounded-lg overflow-hidden" style="height: 300px;">
                    <div class="absolute top-2 left-2 z-20 bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
                        <div class="text-lg mono mb-2">A14 Hörsaalzentrum</div>
                        <div class="space-y-2">
                            ${legend.map(item => `
                                <div class="flex items-center gap-2">
                                    <div class="w-5 h-5 rounded-full flex items-center justify-center mono font-bold" style="background-color: ${item.color}; color: white; font-size: 0.875rem;">${item.symbol}</div>
                                    <span class="mono" style="font-size: 0.875rem;">${item.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                                    <img id="mapImage" src="assets/floorplan.png" alt="Gebäudeplan"
                     class="w-full h-full object-contain cursor-grab p-2"
                         style="transform: scale(1) translate(0px, 0px);">
                    <div id="mapZoomControls" class="absolute bottom-2 right-2 flex flex-col z-20">
                        <button onclick="console.log('[Button] Plus clicked'); zoomMap(1.2)" class="text-base p-0 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors rounded-t-md rounded-b-none" style="width: 2.25rem; height: 2.25rem; min-width: 2.25rem; min-height: 2.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #003c61; border-bottom: none;">+</button>
                        <button onclick="console.log('[Button] Minus clicked'); zoomMap(0.8333)" class="text-base p-0 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-colors rounded-b-md rounded-t-none" style="width: 2.25rem; height: 2.25rem; min-width: 2.25rem; min-height: 2.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #003c61;">−</button>
                    </div>
                </div>
            </div>

            <!-- Stationen -->
            <div class="mb-6">
                <h3 class="mono text-lg mb-4">STATIONEN</h3>
                <div class="space-y-2">
                    <!-- Buchstaben-Stationen zuerst -->
                    ${letterStations.map(station => `
                        <div class="map-station-item shadow-tech">
                            <div class="map-station-number" style="background-color: ${station.color}; color: white;">${station.symbol}</div>
                            <div class="map-station-text">${station.text}</div>
                        </div>
                    `).join('')}
                    
                    <!-- Dann nummerierte Stationen -->
                    ${stations.map((station, index) => `
                        <div class="map-station-item shadow-tech">
                            <div class="map-station-number" style="background-color: ${stationsColor}; color: white;">${index + 1}</div>
                            <div class="map-station-text">${station}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}



// Info-Ansicht rendern
function renderInfo() {
    return `
        <div>
            <div class="space-y-4">
                <div class="ui-element shadow-tech p-4 rounded-lg">
                    <h3 class="mono text-lg mb-3">STUDIUM INFORMATIK</h3>
                    <p class="text-sm mb-3">Das Studium der Informatik an der Uni Oldenburg ist ein wissenschaftliches Studium, d.h. es qualifiziert Absolvent*innen selbstständig und mit wissenschaftlichen Methoden neuartige Fragestellungen im Bereich der Informatik und ihrer Anwendungen zu untersuchen und zu lösen.</p>
                    <a href="https://www.informatik-uni-oldenburg.de/" target="_blank" rel="noopener noreferrer" class="link-button inline-flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md" style="background-color: #004e98;">
                        Für mehr Informationen zum Studium
                        <i class="ph ph-arrow-square-out text-base"></i>
                    </a>
                </div>

                <div class="ui-element shadow-tech p-4 rounded-lg">
                    <h3 class="mono text-lg mb-3">W-LAN</h3>
                    <p class="text-sm terminal p-2 inline-block">${translations.wifiInfo || 'SSID: UniOL-Guest'}</p>
                </div>
            </div>
        </div>
    `;
}

// Service Worker registrieren
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            serviceWorkerRegistration = await navigator.serviceWorker.register('sw.js');
            console.log('[App] Service Worker registered:', serviceWorkerRegistration);

            // Auf Updates hören
            serviceWorkerRegistration.addEventListener('updatefound', () => {
                console.log('[App] Service Worker update found');
                const newWorker = serviceWorkerRegistration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });

            // Nachrichten vom Service Worker empfangen
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[App] Service Worker message:', event.data);

                if (event.data && event.data.type === 'CACHE_UPDATED') {
                    console.log('[App] Cache was updated');
                }

                if (event.data && event.data.type === 'new-version-available') {
                    console.log('[App] New version available:', event.data.version);
                    showUpdateNotification();
                }

                if (event.data && event.data.type === 'update-ready') {
                    console.log('[App] Update ready:', event.data.version);
                    showUpdateNotification();
                }
            });

        } catch (error) {
            console.error('[App] Service Worker registration failed:', error);
        }
    } else {
        console.log('[App] Service Worker not supported');
    }
}



// Update-Benachrichtigung anzeigen
function showUpdateNotification() {
    const updateNotification = document.getElementById('updateNotification');
    if (updateNotification) {
        updateNotification.classList.remove('hidden');

        // Automatisch nach 10 Sekunden ausblenden falls nicht geklickt
        setTimeout(() => {
            if (!updateNotification.classList.contains('hidden')) {
                console.log('[App] Auto-hiding update notification after 10 seconds');
                updateNotification.classList.add('hidden');
            }
        }, 10000);
    }
}

// Update-Benachrichtigung ausblenden
function hideUpdateNotification() {
    const updateNotification = document.getElementById('updateNotification');
    if (updateNotification) {
        updateNotification.classList.add('hidden');
    }
}

// App neu laden
function reloadApp() {
    console.log('[App] Reloading app...');
    hideUpdateNotification();

    if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        console.log('[App] Activating waiting service worker');
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        serviceWorkerRegistration.waiting.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
                console.log('[App] Service worker activated, reloading page');
                window.location.reload();
            }
        });
    } else {
        console.log('[App] No waiting service worker, force reload');
        window.location.reload();
    }
}

// Manuell nach Updates suchen
async function checkForUpdates() {
    if (serviceWorkerRegistration) {
        console.log('[App] Checking for updates...');
        try {
            await serviceWorkerRegistration.update();
            console.log('[App] Update check completed');
        } catch (error) {
            console.error('[App] Update check failed:', error);
        }
    }
}

// Scroll-Header initialisieren (deaktiviert)
function initializeScrollHeader() {
    // Header bleibt immer sichtbar - keine Scroll-Funktionalität
}

// Map Zoom und Pan Funktionalität
let mapScale = 1;
let mapTranslateX = 0;
let mapTranslateY = 0;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

function initializeMapInteraction() {
    const mapImage = document.getElementById('mapImage');
    const mapContainer = mapImage?.parentElement;

    if (!mapImage || !mapContainer) return;

    // Touch/Mouse Events für Dragging
    mapImage.addEventListener('pointerdown', startDrag);
    document.addEventListener('pointermove', drag);
    document.addEventListener('pointerup', endDrag);

    // Pinch-to-Zoom wird IMMER über den Container abgefangen
    // Das erlaubt normales Scrolling auf dem Bild bei mapScale = 1
    mapContainer.addEventListener('touchstart', handleContainerTouchStart, { passive: false });
    mapContainer.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleContainerTouchEnd, { passive: false });

    // Touch Events werden dynamisch verwaltet - nur bei gezoomtem Bild aktiv
    updateTouchEventListeners();

    // Zoom-Controls sind immer sichtbar
}

function updateTouchEventListeners() {
    const mapImage = document.getElementById('mapImage');
    if (!mapImage) return;

    // Alle Touch-Events vom Bild entfernen
    mapImage.removeEventListener('touchstart', handleTouchStart);
    mapImage.removeEventListener('touchmove', handleTouchMove);
    mapImage.removeEventListener('touchend', handleTouchEnd);
    mapImage.removeEventListener('gesturestart', preventGesture);
    mapImage.removeEventListener('gesturechange', preventGesture);
    mapImage.removeEventListener('gestureend', preventGesture);

    if (mapScale > 1) {
        // Nur bei gezoomtem Bild Touch-Events auf dem Bild registrieren
        mapImage.addEventListener('touchstart', handleTouchStart, { passive: false });
        mapImage.addEventListener('touchmove', handleTouchMove, { passive: false });
        mapImage.addEventListener('touchend', handleTouchEnd, { passive: false });
        mapImage.addEventListener('gesturestart', preventGesture, { passive: false });
        mapImage.addEventListener('gesturechange', preventGesture, { passive: false });
        mapImage.addEventListener('gestureend', preventGesture, { passive: false });

        // Touch-Aktionen blockieren für Drag-Funktionalität
        mapImage.style.touchAction = 'none';
    } else {
        // Touch-Aktionen erlauben für normales Scrolling
        mapImage.style.touchAction = 'auto';
    }
    // Bei mapScale = 1: KEINE Touch-Events auf dem Bild - normales Scrolling möglich
}

function startDrag(e) {
    if (mapScale <= 1) return; // Nur dragging wenn gezoomt

    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    const mapImage = document.getElementById('mapImage');
    if (mapImage) {
        mapImage.style.cursor = 'grabbing';
    }

    e.preventDefault();
}

function drag(e) {
    if (!isDragging || mapScale <= 1) return;

    const deltaX = e.clientX - lastPointerX;
    const deltaY = e.clientY - lastPointerY;

    mapTranslateX += deltaX;
    mapTranslateY += deltaY;

    // Grenzen berechnen - verhindert Überschiebung
    const mapImage = document.getElementById('mapImage');
    const mapContainer = mapImage?.parentElement;
    if (mapContainer) {
        const containerRect = mapContainer.getBoundingClientRect();

        // Bei object-contain und padding müssen wir die tatsächliche Bildgröße berechnen
        // Das Bild hat padding: 0.5rem (8px auf jeder Seite)
        const padding = 16; // 8px * 2 (links+rechts bzw. oben+unten)
        const availableWidth = containerRect.width - padding;
        const availableHeight = containerRect.height - padding;

        // Die tatsächliche Bildgröße wird durch object-contain bestimmt
        // und entspricht der verfügbaren Container-Größe minus padding
        const imageDisplayWidth = availableWidth;
        const imageDisplayHeight = availableHeight;

        // Mit translate() scale() - translate wird NICHT skaliert
        // Maximale Verschiebung = (Bildgröße * (scale - 1)) / 2
        const maxTranslateX = Math.max(0, (imageDisplayWidth * (mapScale - 1)) / 2);
        const maxTranslateY = Math.max(0, (imageDisplayHeight * (mapScale - 1)) / 2);

        mapTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, mapTranslateX));
        mapTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, mapTranslateY));
    }

    updateMapTransform();

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
}

function endDrag() {
    isDragging = false;
    const mapImage = document.getElementById('mapImage');
    if (mapImage) {
        mapImage.style.cursor = mapScale > 1 ? 'grab' : 'grab';
    }
}

let lastTouchDistance = 0;

// Container Touch-Handler - nur für Pinch-to-Zoom, erlaubt normales Scrolling
function handleContainerTouchStart(e) {
    // Zoom-Buttons nicht blockieren
    const target = e.target;
    if (target.closest('#mapZoomControls')) {
        return;
    }

    if (e.touches.length === 2) {
        // Nur bei Pinch-Zoom (zwei Finger) Browser-Zoom verhindern
        e.preventDefault();
        e.stopPropagation();
        lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
    }
    // Bei einem Finger: nichts tun - normales Scrolling erlauben
}

function handleContainerTouchMove(e) {
    if (e.touches.length === 2) {
        // Pinch-to-zoom für Map
        e.preventDefault();
        e.stopPropagation();

        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / lastTouchDistance;

        if (Math.abs(scaleChange - 1) > 0.01) { // Mindest-Änderung
            zoomMap(scaleChange);
            lastTouchDistance = currentDistance;
        }
    }
    // Bei einem Finger: nichts tun - normales Scrolling erlauben
}

function handleContainerTouchEnd(e) {
    // Zoom-Buttons nicht blockieren
    const target = e.target;
    if (target.closest('#mapZoomControls')) {
        return;
    }
    // Bei Pinch-End: nichts tun - normales Touch-End erlauben
}

// Bild Touch-Handler - nur für gezoomte Bilder (mapScale > 1)
function handleTouchStart(e) {
    // Diese werden nur bei mapScale > 1 registriert
    const target = e.target;
    if (target.closest('#mapZoomControls')) {
        return;
    }

    if (e.touches.length === 2) {
        // Pinch-to-zoom
        e.preventDefault();
        e.stopPropagation();
        lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
        // Single touch für Dragging
        const touch = e.touches[0];
        lastPointerX = touch.clientX;
        lastPointerY = touch.clientY;
        e.preventDefault();
        e.stopPropagation();
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        // Pinch-to-zoom
        e.preventDefault();
        e.stopPropagation();

        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / lastTouchDistance;

        if (Math.abs(scaleChange - 1) > 0.01) {
            zoomMap(scaleChange);
            lastTouchDistance = currentDistance;
        }
    } else if (e.touches.length === 1) {
        // Single touch dragging
        e.preventDefault();
        e.stopPropagation();

        const touch = e.touches[0];
        const deltaX = touch.clientX - lastPointerX;
        const deltaY = touch.clientY - lastPointerY;

        mapTranslateX += deltaX;
        mapTranslateY += deltaY;

        // Grenzen berechnen
        const mapImage = document.getElementById('mapImage');
        const mapContainer = mapImage?.parentElement;
        if (mapContainer) {
            const containerRect = mapContainer.getBoundingClientRect();
            const padding = 16;
            const availableWidth = containerRect.width - padding;
            const availableHeight = containerRect.height - padding;
            const imageDisplayWidth = availableWidth;
            const imageDisplayHeight = availableHeight;
            const maxTranslateX = Math.max(0, (imageDisplayWidth * (mapScale - 1)) / 2);
            const maxTranslateY = Math.max(0, (imageDisplayHeight * (mapScale - 1)) / 2);

            mapTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, mapTranslateX));
            mapTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, mapTranslateY));
        }

        updateMapTransform();
        lastPointerX = touch.clientX;
        lastPointerY = touch.clientY;
    }
}

function handleTouchEnd(e) {
    const target = e.target;
    if (target.closest('#mapZoomControls')) {
        return;
    }
    // Bei gezoomtem Bild: Touch-End verhindern
    e.preventDefault();
    e.stopPropagation();
}

function preventGesture(e) {
    // Verhindert Gesture-Events (iOS Safari) nur wenn das Bild gezoomt ist
    // Bei nicht gezoomtem Bild soll normales Scrollen möglich sein
    if (mapScale > 1) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    // Bei mapScale = 1 erlauben wir normale Gestures/Scrolling
}

function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function zoomMap(factor) {
    console.log(`[Zoom] Current scale: ${mapScale}, Factor: ${factor}`);
    const newScale = Math.max(1, Math.min(4, mapScale * factor));
    console.log(`[Zoom] New scale: ${newScale}`);

    if (newScale !== mapScale) {
        const wasZoomed = mapScale > 1;
        mapScale = newScale;
        const isNowZoomed = mapScale > 1;

        // Wenn auf Originalgröße zurückgezoomt wird, Position zentrieren
        if (mapScale <= 1) {
            mapTranslateX = 0;
            mapTranslateY = 0;
        } else {
            // Position nach Zoom korrigieren - verhindert dass Bild zu weit innen liegt
            const mapImage = document.getElementById('mapImage');
            const mapContainer = mapImage?.parentElement;
            if (mapContainer) {
                const containerRect = mapContainer.getBoundingClientRect();

                // Bei object-contain und padding müssen wir die tatsächliche Bildgröße berechnen
                const padding = 16; // 8px * 2 (links+rechts bzw. oben+unten)
                const availableWidth = containerRect.width - padding;
                const availableHeight = containerRect.height - padding;

                const imageDisplayWidth = availableWidth;
                const imageDisplayHeight = availableHeight;

                // Neue maximale Verschiebung berechnen
                const maxTranslateX = Math.max(0, (imageDisplayWidth * (mapScale - 1)) / 2);
                const maxTranslateY = Math.max(0, (imageDisplayHeight * (mapScale - 1)) / 2);

                // Position in die neuen Grenzen einpassen
                mapTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, mapTranslateX));
                mapTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, mapTranslateY));
            }
        }

        updateMapTransform();
        updateMapCursor();

        // Touch-Event-Listener aktualisieren wenn sich Zoom-Status ändert
        if (wasZoomed !== isNowZoomed) {
            updateTouchEventListeners();
        }

        console.log(`[Zoom] Applied scale: ${mapScale}, Position: ${mapTranslateX}, ${mapTranslateY}`);
    } else {
        console.log(`[Zoom] No change - scale remained: ${mapScale}`);
    }
}

function resetMapZoom() {
    mapScale = 1;
    mapTranslateX = 0;
    mapTranslateY = 0;
    updateMapTransform();
    updateMapCursor();
}

function updateMapTransform() {
    const mapImage = document.getElementById('mapImage');
    if (mapImage) {
        // Transform-Reihenfolge: translate DANN scale
        // So wird zuerst verschoben, dann skaliert (nicht umgekehrt)
        mapImage.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px) scale(${mapScale})`;
    }
}

function updateMapCursor() {
    const mapImage = document.getElementById('mapImage');
    if (mapImage) {
        mapImage.style.cursor = mapScale > 1 ? 'grab' : 'grab';
    }
}


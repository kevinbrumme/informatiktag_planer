// Globale Variablen
let currentLanguage = 'de';
let currentSection = 'agenda';
let translations = {};
let events = [];
let theme = {};
let availableLanguages = [];
let stations = [];
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

    // Text-Span Element finden
    const textSpan = activeButton.querySelector('span');
    if (!textSpan) return;

    // Positionen ermitteln
    const buttonRect = activeButton.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();
    const textRect = textSpan.getBoundingClientRect();

    // Relative Position des Buttons innerhalb des Containers
    const leftOffset = buttonRect.left - containerRect.left;
    const buttonWidth = buttonRect.width;

    // Textbreite und zentrierte Position
    const textWidth = textRect.width;
    const textLeft = textRect.left - containerRect.left;

    // Linie an Textbreite anpassen und zentrieren
    indicator.style.width = `${textWidth}px`;
    indicator.style.left = `${textLeft}px`;
    indicator.style.transform = 'none';
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
        'Führung': 'rgba(242, 145, 0, 0.2)',     // Orange mit 20% Opacity
        'quiz': 'rgba(212, 57, 11, 0.2)'         // Rot mit 20% Opacity
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
                    <div class="event-card pt-2 pb-0 relative">
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
            <div class="map-container mb-6 rounded-xl bg-white overflow-hidden">
                <div class="relative rounded-lg overflow-hidden" style="height: 300px;">
                    <div class="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-sm px-2 py-1 rounded">
                        <div class="text-lg mono">Lageplan</div>
                        <div class="text-sm mono text-gray-600">A14 Hörsaalzentrum</div>
                    </div>
                                    <img id="mapImage" src="assets/floorplan.png" alt="Gebäudeplan"
                     class="w-full h-full object-contain cursor-grab p-2"
                         style="transform: scale(1) translate(0px, 0px);">
                    <div id="mapZoomControls" class="absolute bottom-2 right-2 flex flex-col z-20">
                        <button onclick="zoomMap(1.25)" class="text-base p-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors rounded-t-md rounded-b-none" style="width: 2.25rem; height: 2.25rem; min-width: 2.25rem; min-height: 2.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #003c61; border-bottom: none;">+</button>
                        <button onclick="zoomMap(0.8)" class="text-base p-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors rounded-b-md rounded-t-none" style="width: 2.25rem; height: 2.25rem; min-width: 2.25rem; min-height: 2.25rem; display: flex; align-items: center; justify-content: center; border: 1px solid #003c61;">−</button>
                    </div>
                </div>
            </div>

            <!-- Nummerierte Stationen -->
            <div class="mb-6">
                <h3 class="mono text-lg mb-4">STATIONEN</h3>
                <div class="space-y-2">
                    ${stations.map((station, index) => `
                        <div class="map-station-item">
                            <div class="map-station-number" style="background-color: ${stationsColor}; color: white;">${index + 1}</div>
                            <div class="map-station-text">${station}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Legende -->
            <div>
                <h3 class="mono text-lg mb-4">LEGENDE</h3>
                <div class="space-y-2">
                    ${legend.map(item => `
                        <div class="map-station-item">
                            <div class="map-station-number" style="background-color: ${item.color}; color: white;">${item.symbol}</div>
                            <div class="map-station-text">${item.text}</div>
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
                <div class="ui-element p-4 rounded-lg">
                    <h3 class="mono text-lg mb-3">STUDIUM INFORMATIK</h3>
                    <p class="text-sm mb-3">Das Studium der Informatik an der Uni Oldenburg ist ein wissenschaftliches Studium, d.h. es qualifiziert Absolvent*innen selbstständig und mit wissenschaftlichen Methoden neuartige Fragestellungen im Bereich der Informatik und ihrer Anwendungen zu untersuchen und zu lösen.</p>
                    <a href="https://www.informatik-uni-oldenburg.de/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 text-sm text-white rounded-md hover:opacity-90 transition-opacity" style="background-color: #004e98;">
                        Für mehr Informationen zum Studium
                        <i class="ph ph-arrow-square-out text-base"></i>
                    </a>
                </div>

                <div class="ui-element p-4 rounded-lg">
                    <h3 class="mono text-lg mb-3">NETZWERK</h3>
                    <p class="text-sm terminal p-2 inline-block">${translations.wifiInfo || 'SSID: UniOL-Guest'}</p>
                </div>
                <div class="ui-element p-4 rounded-lg">
                    <h3 class="mono text-lg mb-3">NOTFALL</h3>
                    <p class="text-sm terminal p-2 inline-block">${translations.emergencyInfo || 'CALL: 0441-798-0'}</p>
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
                if (event.data && event.data.type === 'CACHE_UPDATED') {
                    console.log('[App] Cache was updated');
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
    if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        serviceWorkerRegistration.waiting.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
                window.location.reload();
            }
        });
    } else {
        window.location.reload();
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

    // Touch Zoom (Pinch) - aber verhindert Browser-Zoom
    mapContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Verhindert alle Touch-Gesten die zu Browser-Zoom führen könnten
    mapContainer.addEventListener('gesturestart', preventGesture, { passive: false });
    mapContainer.addEventListener('gesturechange', preventGesture, { passive: false });
    mapContainer.addEventListener('gestureend', preventGesture, { passive: false });

    // Zoom-Controls sind immer sichtbar
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

    // Grenzen berechnen
    const mapImage = document.getElementById('mapImage');
    const mapContainer = mapImage?.parentElement;
    if (mapContainer) {
        const containerRect = mapContainer.getBoundingClientRect();
        const maxTranslateX = (containerRect.width * (mapScale - 1)) / 2;
        const maxTranslateY = (containerRect.height * (mapScale - 1)) / 2;

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

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        // Nur bei Pinch-Zoom (zwei Finger) Browser-Zoom verhindern
        e.preventDefault();
        e.stopPropagation();
        lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
        // Single touch für Dragging vorbereiten, aber nur verhindern wenn bereits gezoomt
        const touch = e.touches[0];
        lastPointerX = touch.clientX;
        lastPointerY = touch.clientY;

        // Nur preventDefault wenn die Karte bereits gezoomt ist (dann ist Dragging erwünscht)
        if (mapScale > 1) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        // Pinch-to-zoom für Map - Browser-Zoom verhindern
        e.preventDefault();
        e.stopPropagation();

        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / lastTouchDistance;

        if (Math.abs(scaleChange - 1) > 0.01) { // Mindest-Änderung
            zoomMap(scaleChange);
            lastTouchDistance = currentDistance;
        }
    } else if (e.touches.length === 1 && mapScale > 1) {
        // Single touch dragging nur wenn gezoomt - dann Scrolling verhindern
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
            const maxTranslateX = (containerRect.width * (mapScale - 1)) / 2;
            const maxTranslateY = (containerRect.height * (mapScale - 1)) / 2;

            mapTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, mapTranslateX));
            mapTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, mapTranslateY));
        }

        updateMapTransform();

        lastPointerX = touch.clientX;
        lastPointerY = touch.clientY;
    }
    // Bei einem Finger und nicht gezoomter Karte: normales Scrollen erlauben (kein preventDefault)
}

function handleTouchEnd(e) {
    // Nur preventDefault wenn wir aktiv mit der Karte interagiert haben
    if (e.changedTouches.length === 1 && mapScale > 1) {
        // Nur verhindern wenn die Karte gezoomt ist (war wahrscheinlich Dragging)
        e.preventDefault();
        e.stopPropagation();
    }
    // Sonst normales Touch-End-Verhalten erlauben
}

function preventGesture(e) {
    // Verhindert alle Gesture-Events (iOS Safari)
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function zoomMap(factor) {
    const newScale = Math.max(0.5, Math.min(8, mapScale * factor));

    if (newScale !== mapScale) {
        mapScale = newScale;

        // Wenn auf Originalgröße oder kleiner gezoomt wird, Position zentrieren
        if (mapScale <= 1) {
            mapTranslateX = 0;
            mapTranslateY = 0;
        }

        updateMapTransform();
        updateMapCursor();

        // Controls sind immer sichtbar
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
        mapImage.style.transform = `scale(${mapScale}) translate(${mapTranslateX}px, ${mapTranslateY}px)`;
    }
}

function updateMapCursor() {
    const mapImage = document.getElementById('mapImage');
    if (mapImage) {
        mapImage.style.cursor = mapScale > 1 ? 'grab' : 'grab';
    }
}


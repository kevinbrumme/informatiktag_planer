// Globale Variablen
let currentLanguage = 'de';
let currentSection = 'agenda';
let translations = {};
let events = [];
let theme = {};
let availableLanguages = [];

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
    const possibleLanguages = [
        { code: 'de', name: '🇩🇪 DE', file: 'de.json' },
        { code: 'en', name: '🇬🇧 EN', file: 'en.json' },
        { code: 'fr', name: '🇫🇷 FR', file: 'fr.json' }
    ];

    availableLanguages = [];

    for (const lang of possibleLanguages) {
        try {
            const response = await fetch(`/data/i18n/${lang.file}`, { method: 'HEAD' });
            if (response.ok) {
                availableLanguages.push(lang);
            }
        } catch (error) {
            // Sprache nicht verfügbar (404 ist erwartetes Verhalten)
            // console.log(`Sprache ${lang.code} nicht verfügbar`);
        }
    }

    // Fallback zu Deutsch, falls verfügbar
    if (availableLanguages.length > 0) {
        const defaultLang = availableLanguages.find(lang => lang.code === 'de') || availableLanguages[0];
        currentLanguage = defaultLang.code;
    }

    console.log('Verfügbare Sprachen:', availableLanguages);
}

// Übersetzungen laden
async function loadTranslations() {
    try {
        const response = await fetch(`/data/i18n/${currentLanguage}.json`);
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
        const response = await fetch('/data/events.json');
        events = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
    }
}

// Theme laden
async function loadTheme() {
    try {
        const response = await fetch('/data/theme.json');
        theme = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden des Themes:', error);
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
    const navFavorites = document.querySelector('#nav-favorites span');
    const navInfo = document.querySelector('#nav-info span');

    if (navAgenda) navAgenda.textContent = (translations.agenda || 'AGENDA').toUpperCase();
    if (navMap) navMap.textContent = (translations.map || 'PLAN').toUpperCase();
    if (navFavorites) navFavorites.textContent = (translations.favorites || 'GEMERKT').toUpperCase();
    if (navInfo) navInfo.textContent = 'INFO';

    // Seiten-Titel aktualisieren
    document.title = `Univent - ${translations.eventTitle || 'Informatiktag 2025'}`;
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

    // Content laden
    switch (section) {
        case 'agenda':
            mainContent.innerHTML = renderAgenda();
            break;
        case 'map':
            mainContent.innerHTML = renderMap();
            break;
        case 'favorites':
            mainContent.innerHTML = renderFavorites();
            break;
        case 'info':
            mainContent.innerHTML = renderInfo();
            break;
        default:
            mainContent.innerHTML = renderAgenda();
    }
}

// Agenda-Ansicht rendern
function renderAgenda() {
    return `
        <div>
            <h2 class="mono text-2xl mb-6">${translations.agenda || 'AGENDA'}</h2>
            <div class="space-y-4">
                ${events.map(event => {
        // Kategorie-Übersetzung ermitteln
        const categoryKey = `category${event.category.charAt(0).toUpperCase() + event.category.slice(1)}`;
        const categoryText = translations[categoryKey] || '';

        return `
                    <div class="event-card pt-2 px-4 pb-4 relative">
                        <!-- Event Type Badge rechts oben -->
                        ${categoryText ? `
                            <span class="event-type-badge event-type-${event.category}">
                                ${categoryText}
                            </span>
                        ` : ''}
                        
                        <!-- Zeit-Badge links oben -->
                        <div class="mb-1">
                            <span class="time-badge text-xs">
                                ${event.start} - ${event.end}
                            </span>
                        </div>
                        
                        <!-- Titel -->
                        <h3 class="mono text-lg mb-2">${event.title}</h3>
                        
                        <!-- Beschreibung -->
                        <p class="text-sm mb-3 leading-relaxed">${event.description}</p>
                        
                        <!-- Referent (falls vorhanden) -->
                        ${event.speaker ? `<p class="text-xs mono mb-3">REFERENT: ${event.speaker}</p>` : ''}
                        
                        <!-- Trennlinie -->
                        <div class="event-separator"></div>
                        
                        <!-- Ort-Badge unten -->
                        <div class="flex justify-start">
                            <span class="location-badge text-xs">
                                LOC: ${event.location}
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
            <h2 class="mono text-2xl mb-6">${translations.map || 'GEBÄUDEPLAN'}</h2>
            <div class="map-container p-4">
                <div class="aspect-video border-tech flex items-center justify-center bg-tech">
                    <img src="/assets/floorplan.png" alt="Gebäudeplan" class="max-w-full max-h-full object-contain">
                </div>
                <p class="text-sm mono mt-4">${translations.mapLegend || 'NAVIGATION // UNIVERSITÄT OLDENBURG'}</p>
            </div>
        </div>
    `;
}

// Merken-Ansicht rendern
function renderFavorites() {
    return `
        <div>
            <h2 class="mono text-2xl mb-6">${translations.favorites || 'GEMERKT'}</h2>
            <div class="ui-element p-4">
                <p class="mono text-sm mb-2">${translations.noFavorites || 'NOCH NICHTS GEMERKT'}</p>
                <p class="text-sm">Merken-Funktionalität wird implementiert...</p>
            </div>
        </div>
    `;
}

// Info-Ansicht rendern
function renderInfo() {
    return `
        <div>
            <h2 class="mono text-2xl mb-6">SYSTEM INFO</h2>
            <div class="space-y-4">
                <div class="ui-element p-4">
                    <h3 class="mono text-lg mb-3">${translations.eventTitle || 'INFORMATIKTAG "ZUKUNFT IST JETZT"'}</h3>
                    <p class="text-sm mb-2">${translations.eventSubtitle || 'Praxisnahe Einblicke für Ihre Schüler*innen'}</p>
                    <p class="text-sm mb-4">${translations.universityName || 'Universität Oldenburg'}</p>
                    <div class="terminal p-3">
                        <p class="text-xs mb-1">DATE: ${translations.eventDate || '24. Juni 2025'}</p>
                        <p class="text-xs mb-1">TIME: ${translations.eventTime || '8:30 - 13:30'}</p>
                        <p class="text-xs">LOC: ${translations.eventLocation || 'A14 Hörsaalzentrum'}</p>
                    </div>
                </div>
                <div class="ui-element p-4">
                    <h3 class="mono text-lg mb-3">KONTAKT</h3>
                    <p class="text-sm">${translations.contactInfo || 'informatiktag@uol.de'}</p>
                </div>
                <div class="ui-element p-4">
                    <h3 class="mono text-lg mb-3">NETWORK</h3>
                    <p class="text-sm terminal p-2 inline-block">${translations.wifiInfo || 'SSID: UniOL-Guest'}</p>
                </div>
                <div class="ui-element p-4">
                    <h3 class="mono text-lg mb-3">EMERGENCY</h3>
                    <p class="text-sm terminal p-2 inline-block">${translations.emergencyInfo || 'CALL: 0441-798-0'}</p>
                </div>
                <div class="ui-element p-4">
                    <h3 class="mono text-lg mb-3">ACCESSIBILITY</h3>
                    <p class="text-sm">${translations.accessibilityInfo || 'Alle Räume sind barrierefrei zugänglich'}</p>
                </div>
            </div>
        </div>
    `;
}

// Service Worker registrieren
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
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

// Scroll-Header initialisieren
function initializeScrollHeader() {
    let lastScrollY = window.scrollY;
    let isHeaderCollapsed = false;

    const headerTop = document.getElementById('headerTop');
    const headerBottom = document.getElementById('headerBottom');

    function updateHeader() {
        const currentScrollY = window.scrollY;
        const scrollDifference = currentScrollY - lastScrollY;

        // Nach unten scrollen und genug gescrollt → Header kollabieren
        if (currentScrollY > 50 && scrollDifference > 0 && !isHeaderCollapsed) {
            collapseHeader();
            isHeaderCollapsed = true;
        }
        // Nur ganz oben → Header erweitern
        else if (currentScrollY <= 20 && isHeaderCollapsed) {
            expandHeader();
            isHeaderCollapsed = false;
        }

        lastScrollY = currentScrollY;
    }

    function collapseHeader() {
        if (headerTop) {
            headerTop.style.maxHeight = '0px';
            headerTop.style.marginBottom = '0px';
            headerTop.style.opacity = '0';
        }
        if (headerBottom) {
            headerBottom.style.paddingTop = '0.25rem';
            headerBottom.style.paddingBottom = '0.25rem';
        }
    }

    function expandHeader() {
        if (headerTop) {
            headerTop.style.maxHeight = '100px';
            headerTop.style.marginBottom = '0.75rem';
            headerTop.style.opacity = '1';
        }
        if (headerBottom) {
            headerBottom.style.paddingTop = '0';
            headerBottom.style.paddingBottom = '0';
        }
    }

    // Initial-Zustand setzen
    if (headerTop) {
        headerTop.style.maxHeight = '100px';
        headerTop.style.transition = 'all 0.3s ease-in-out';
    }
    if (headerBottom) {
        headerBottom.style.transition = 'all 0.3s ease-in-out';
    }

    // Scroll-Event mit Throttling
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = requestAnimationFrame(updateHeader);
    }, { passive: true });
} 
// Globale Variablen
let currentLanguage = 'de';
let currentSection = 'agenda';
let translations = {};
let events = [];
let theme = {};
let availableLanguages = [];
let isOnline = navigator.onLine;
let serviceWorkerRegistration = null;

// App initialisieren
document.addEventListener('DOMContentLoaded', async () => {
    // Service Worker registrieren
    await registerServiceWorker();

    // Offline-Status überwachen
    initializeOfflineDetection();

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
            const response = await fetch(`./data/i18n/${lang.file}`, { method: 'HEAD' });
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
        const response = await fetch(`./data/i18n/${currentLanguage}.json`);
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
        const response = await fetch('./data/events.json');
        events = await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
    }
}

// Theme laden
async function loadTheme() {
    try {
        const response = await fetch('./data/theme.json');
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
        btn.classList.remove('active', 'text-blue-600');
        btn.classList.add('text-gray-500');
    });

    activeButton.classList.add('active', 'text-blue-600');
    activeButton.classList.remove('text-gray-500');
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
    headerTitle.setAttribute('data-text', titleText);

    // Navigation aktualisieren
    document.getElementById('navAgenda').textContent = translations.agenda || 'Agenda';
    document.getElementById('navMap').textContent = translations.map || 'Plan';
    document.getElementById('navFavorites').textContent = translations.favorites || 'Favoriten';
    document.getElementById('navInfo').textContent = 'Info';

    // Seiten-Titel aktualisieren
    document.title = `UniVent - ${translations.eventTitle || 'Informatiktag 2025'}`;
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
        <div class="p-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">${translations.agenda || 'Agenda'}</h2>
            <div class="space-y-4">
                ${events.map(event => {
        // Kategorie-Übersetzung ermitteln
        const categoryKey = `category${event.category.charAt(0).toUpperCase() + event.category.slice(1)}`;
        const categoryText = translations[categoryKey] || '';

        return `
                    <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                        <!-- Pills oben -->
                        <div class="flex justify-between items-center mb-3">
                            <!-- Zeit-Pill links -->
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ${event.start} - ${event.end} ${translations.clock || 'Uhr'}
                            </span>
                            
                            <!-- Kategorie-Pill rechts (nur wenn Kategorie vorhanden) -->
                            ${categoryText ? `
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    ${categoryText}
                                </span>
                            ` : ''}
                        </div>
                        
                        <!-- Titel -->
                        <h3 class="font-medium text-gray-900 mb-2">${event.title}</h3>
                        
                        <!-- Beschreibung -->
                        <p class="text-sm text-gray-700 mb-3">${event.description}</p>
                        
                        <!-- Referent (falls vorhanden) -->
                        ${event.speaker ? `<p class="text-xs text-blue-600 mb-3">${translations.speaker || 'Referent'}: ${event.speaker}</p>` : ''}
                        
                        <!-- Ort-Pill unten links -->
                        <div class="flex justify-start">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                📍 ${event.location}
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
        <div class="p-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">${translations.map || 'Plan'}</h2>
            <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div class="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                    <img src="./assets/floorplan.png" alt="Gebäudeplan" class="max-w-full max-h-full object-contain">
                </div>
                <p class="text-sm text-gray-600 mt-2">${translations.mapLegend || 'Kartenlegende'}</p>
            </div>
        </div>
    `;
}

// Favoriten-Ansicht rendern
function renderFavorites() {
    return `
        <div class="p-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">${translations.favorites || 'Favoriten'}</h2>
            <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <p class="text-gray-600">${translations.noFavorites || 'Noch keine Favoriten'}</p>
                <p class="text-sm text-gray-500 mt-2">Favoriten-Funktionalität wird implementiert...</p>
            </div>
        </div>
    `;
}

// Info-Ansicht rendern
function renderInfo() {
    return `
        <div class="p-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-900">Info</h2>
            <div class="space-y-4">
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">${translations.eventTitle || 'Informatiktag "Zukunft ist jetzt"'}</h3>
                    <p class="text-gray-600">${translations.eventSubtitle || 'Praxisnahe Einblicke für Ihre Schüler*innen'}</p>
                    <p class="text-gray-600">${translations.universityName || 'Universität Oldenburg'}</p>
                    <div class="mt-3 space-y-1">
                        <p class="text-gray-700 font-medium">${translations.eventDate || '24. Juni 2025'}</p>
                        <p class="text-gray-600">${translations.eventTime || '8:30 - 13:30'}</p>
                        <p class="text-gray-600">${translations.eventLocation || 'A14 Hörsaalzentrum'}</p>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Kontakt</h3>
                    <p class="text-gray-600">${translations.contactInfo || 'informatiktag@uol.de'}</p>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">WLAN</h3>
                    <p class="text-gray-600">${translations.wifiInfo || 'WLAN: UniOL-Guest'}</p>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Notfall</h3>
                    <p class="text-gray-600">${translations.emergencyInfo || 'Notfall: 0441-798-0'}</p>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Barrierefreiheit</h3>
                    <p class="text-gray-600">${translations.accessibilityInfo || 'Alle Räume sind barrierefrei zugänglich'}</p>
                </div>
            </div>
        </div>
    `;
}

// Service Worker registrieren
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js');
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

// Offline-Erkennung initialisieren
function initializeOfflineDetection() {
    // Online/Offline Status überwachen
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('[App] Back online');
        hideOfflineNotification();
        // Daten synchronisieren
        if (serviceWorkerRegistration && serviceWorkerRegistration.sync) {
            serviceWorkerRegistration.sync.register('background-sync');
        }
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('[App] Gone offline');
        showOfflineNotification();
    });

    // Initial prüfen
    updateOnlineStatus();
}

// Online-Status aktualisieren
function updateOnlineStatus() {
    isOnline = navigator.onLine;

    if (!isOnline) {
        showOfflineNotification();
    } else {
        hideOfflineNotification();
    }
}

// Offline-Benachrichtigung anzeigen
function showOfflineNotification() {
    let offlineBar = document.getElementById('offline-bar');

    if (!offlineBar) {
        offlineBar = document.createElement('div');
        offlineBar.id = 'offline-bar';
        offlineBar.className = 'fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 text-sm z-50';
        offlineBar.innerHTML = `
            <span>${translations.offlineMode || 'Offline-Modus'}</span>
            <span class="ml-2">📱</span>
        `;
        document.body.appendChild(offlineBar);

        // Header anpassen
        const header = document.querySelector('header');
        if (header) {
            header.style.marginTop = '40px';
        }
    }

    offlineBar.style.display = 'block';
}

// Offline-Benachrichtigung ausblenden
function hideOfflineNotification() {
    const offlineBar = document.getElementById('offline-bar');
    if (offlineBar) {
        offlineBar.style.display = 'none';

        // Header zurücksetzen
        const header = document.querySelector('header');
        if (header) {
            header.style.marginTop = '0';
        }
    }
}

// Update-Benachrichtigung anzeigen
function showUpdateNotification() {
    const updateBar = document.createElement('div');
    updateBar.className = 'fixed bottom-20 left-4 right-4 bg-blue-600 text-white rounded-lg p-3 z-50 flex justify-between items-center';
    updateBar.innerHTML = `
        <span>Neue Version verfügbar!</span>
        <button onclick="reloadApp()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
            Aktualisieren
        </button>
    `;
    document.body.appendChild(updateBar);

    // Nach 10 Sekunden automatisch entfernen
    setTimeout(() => {
        if (updateBar.parentNode) {
            updateBar.parentNode.removeChild(updateBar);
        }
    }, 10000);
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
        // Nach oben scrollen oder ganz oben → Header erweitern
        else if ((scrollDifference < -10 || currentScrollY <= 20) && isHeaderCollapsed) {
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
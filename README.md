# Informatiktag 2025 📱

## 🚀 Lokales Testen

### Mit Node.js/npm (Empfohlen)
```bash
npm install
npm run dev    # Startet Server und öffnet Browser
```

### Alternative
```bash
python -m http.server 3000
```

App läuft auf: http://localhost:3000

## ✅ Implementierte Features

- **📱 Mobile-First Design** mit Tailwind CSS
- **🌐 Mehrsprachigkeit** - Dynamische Spracherkennung (DE/EN/FR)
- **📋 Navigation** - Agenda, Plan, Favoriten, Info
- **📅 Event-Anzeige** - Alle Events mit Details
- **🗺️ Karte** - Gebäudegrundriss A14
- **ℹ️ Info-Seite** - Kontakt, WLAN, Notfall, Barrierefreiheit
- **🔄 Offline-Funktionalität** - Service Worker mit Cache-Strategien
- **📲 PWA-Ready** - Web App Manifest, installierbar
- **🚫 Offline-Erkennung** - Automatische Benachrichtigung bei Verbindungsproblemen
- **🔄 Auto-Updates** - Hintergrund-Synchronisation

## 🔧 Projekt-Struktur

```
informatiktag/
├── index.html          # Haupt-App
├── sw.js              # Service Worker (Offline-Cache)
├── manifest.json      # PWA-Manifest
├── js/app.js          # JavaScript-Logik
├── data/
│   ├── events.json    # Event-Daten
│   ├── theme.json     # Design-Farben
│   └── i18n/          # Übersetzungen (dynamisch erkannt)
├── assets/            # Bilder & Icons
└── package.json       # NPM-Konfiguration
```

## 📝 Nächste Schritte

- [ ] Favoriten-Funktionalität
- [x] Service Worker (Offline-Modus) ✅
- [ ] Event-Details-Seiten
- [ ] Such- und Filter-Funktionen
- [x] PWA-Manifest ✅

## 📱 Offline-Funktionalität

Die Informatiktag-App funktioniert jetzt **vollständig offline**:

### 🔄 Cache-Strategien
- **Static Assets** - Cache First (HTML, CSS, JS, Bilder)
- **API-Daten** - Network First mit Fallback (JSON-Dateien)
- **Navigation** - Immer verfügbar (auch offline)

### 📲 PWA-Features
- **Installierbar** - "Zum Homescreen hinzufügen"
- **Shortcuts** - Direkte Links zu Agenda, Karte, Favoriten
- **Offline-Banner** - Automatische Benachrichtigung
- **Auto-Updates** - Im Hintergrund

### 🔧 Testen der Offline-Funktionalität
1. App laden: `npm run dev`
2. Browser-DevTools → Network → "Offline" aktivieren
3. App weiter verwenden → Funktioniert offline! 📱

## 🌐 GitHub Pages Deployment

1. Repository auf GitHub pushen
2. In Settings → Pages → Source: "Deploy from branch"
3. Branch: main, Folder: / (root)
4. App verfügbar unter: `https://username.github.io/informatiktag` 
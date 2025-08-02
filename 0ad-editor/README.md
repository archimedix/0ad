# 0 A.D. Map Editor

Un editor web moderno per le mappe di 0 A.D. con interfaccia Vue.js e backend Express.

## Caratteristiche

- 🗺️ **Visualizzazione heightmap**: Mostra le altitudini della mappa con colori
- 🎨 **Supporto texture**: Legge e visualizza le texture del terreno
- 📊 **Informazioni dettagliate**: Mostra metadati completi delle mappe
- 🖱️ **Interazione**: Zoom, pan e informazioni real-time
- 💾 **Import/Export**: Carica e salva mappe modificate

## Installazione

```bash
# Clona il progetto (se necessario)
cd 0ad-editor

# Installa tutte le dipendenze
npm run setup

# Avvia l'applicazione (backend + frontend)
npm run dev
```

## Utilizzo

1. **Avvia l'applicazione**: `npm run dev`
2. **Apri il browser**: http://localhost:3000
3. **Seleziona una mappa**: Dalle mappe disponibili o carica nuovi file
4. **Esplora**: Usa i controlli zoom e le modalità di visualizzazione

## Struttura

```
0ad-editor/
├── backend/                 # Server Express + API
│   ├── server.js           # Server principale
│   ├── maps/               # File mappe (.pmp/.xml)
│   └── *.js                # Utils importati da 0ad tools
├── frontend/               # App Vue.js
│   ├── src/
│   │   ├── components/     # Componenti riutilizzabili
│   │   ├── views/          # Pagine principali
│   │   └── stores/         # State management
│   └── dist/               # Build produzione
└── package.json           # Script principali
```

## API Endpoints

- `GET /api/maps` - Lista mappe disponibili
- `GET /api/maps/:name` - Carica mappa specifica
- `POST /api/maps/:name/save` - Salva modifiche
- `POST /api/upload` - Upload nuovi file
- `GET /api/textures/:name` - Info texture

## Tecnologie

- **Backend**: Node.js, Express.js, Multer
- **Frontend**: Vue.js 3, Tailwind CSS, Axios
- **Build**: Vite, PostCSS
- **Parsing**: Custom PMP/XML utils

## Sviluppo

```bash
# Solo backend
npm run backend

# Solo frontend  
npm run frontend

# Entrambi (consigliato)
npm run dev
```

L'app sarà disponibile su:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
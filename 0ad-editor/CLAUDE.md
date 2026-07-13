# CLAUDE.md — 0ad-editor

Guida per Claude Code al web editor di mappe per 0 A.D. Vale per tutto ciò che sta sotto `0ad-editor/`; per il quadro generale del repo (CLI, formato PMP, moduli condivisi) vedi il `CLAUDE.md` alla radice.

## A cosa serve

Editor web per visualizzare mappe di 0 A.D. e piazzarci sopra cluster di risorse naturali (foreste, pietre, metalli) cliccando sulla mappa. Non modifica il terreno: legge heightmap e texture dal `.pmp` in sola lettura e scrive **solo** entità nello scenario `.xml`, sempre su un nuovo file `<nome>_edited.xml` (l'originale non viene mai toccato).

## Cosa fa (funzionalità utente)

- **Selezione mappa** dal pannello laterale (lista da `maps/` del backend; serve la coppia `.pmp` + `.xml`). La mappa scelta persiste in `localStorage` ed è deep-linkabile come `/:mapName`.
- **Tre modalità di visualizzazione** (tab "Vista"): `heightmap` (colori per altitudine, con slider livello acqua / soglia spiaggia / soglia colline), `texture` (indici texture del terreno), `entities` (entità dello scenario; i Civil Center sono evidenziati con i colori player).
- **Navigazione canvas**: zoom (rotella o pulsanti, 0.1×–5×), pan (drag), reset vista.
- **Piazzamento risorse**: selezioni un tipo di risorsa (tab "Risorse") → l'editor passa automaticamente in modalità `place` → ogni click sulla mappa aggiunge un cluster **pending** (solo client-side, cerchi disegnati sul canvas). Densità/raggio/numero sono regolabili; tornare in modalità `navigate` deseleziona la risorsa.
- **Salvataggio**: il pulsante save invia tutti i cluster pending a `save-with-resources`, che ricarica l'XML originale, appende le entità e scrive `<nome>_edited.xml`; poi la mappa viene ricaricata. Senza cluster pending salva solo lo scenario (`/save`).

## Avvio

```bash
cd 0ad-editor
npm run setup      # npm install in backend/ e frontend/
npm run dev        # backend :3001 + frontend :3000 (concurrently)
```

Frontend su http://localhost:3000 (Vite, proxy `/api` → :3001). Solo una parte: `npm run backend` / `npm run frontend`. Build produzione: `cd frontend && npm run build`. Nessun test o linter configurato.

## Architettura

### Backend (`backend/`, Express, porta 3001)

`server.js` + copie locali dei moduli core del repo root (`pmp-utils.js`, `xml-utils.js`, `map-utils.js`, `resource-config.js`, …). **Attenzione: le copie sono divergenti dalla root** — qui `createEntity()` non aggiunge `Player` (entità Gaia) e `resource-config.js` contiene `RESOURCE_TYPES` + `generateResourceCluster()` che nella root non esistono. Le mappe stanno in `backend/maps/` (directory distinta da `maps/` alla radice del repo).

Endpoint:

| Endpoint | Cosa fa |
|---|---|
| `GET /api/maps` | basename con entrambi `.pmp` e `.xml` |
| `GET /api/maps/:name` | `{ heightmap:{size,mapDim,altitudes}, textures, scenario }` |
| `POST /api/maps/:name/save-with-resources` | ricarica l'XML **originale**, appende i cluster, scrive `_edited.xml` (percorso usato dal save del frontend) |
| `POST /api/maps/:name/place-resources` | piazzamento singolo cluster lato server (non usato dal flusso attuale del frontend) |
| `POST /api/maps/:name/save` | salva lo scenario così com'è in `_edited.xml` |
| `POST /api/upload` | upload multer di coppia `.pmp`+`.xml` in `maps/` |
| `GET /api/textures/:name` | nomi texture + dimensioni griglia tile |

UID delle nuove entità: da `max(1000, maxUID esistente + 1)`.

### Frontend (`frontend/`, Vue 3 + Vite + Tailwind)

- Router in `main.js`: `/` e `/:mapName?` → entrambi `views/MapEditor.vue`. `views/Home.vue` **non è routato** (dead code con UI di upload). Pinia è installato ma non usato: lo stato vive nei **composables**.
- `composables/useMapManagement.js` — lista/caricamento mappe via axios, mappa selezionata, range altitudini, livello acqua letto da `Scenario.Environment.Water.WaterBody.Height`.
- `composables/useResourceManagement.js` — tipi risorsa (copia hardcoded di `RESOURCE_TYPES` del backend, **da tenere sincronizzata a mano**), parametri cluster, lista `pendingResourceClusters`, chiamate di salvataggio.
- `composables/useUIState.js` — viewMode, livello acqua/soglie, modalità interazione (`navigate`/`place`), toast.
- `views/MapEditor.vue` — collega i composables e definisce i wrapper `enhanced*` per la logica trasversale (es. selezione risorsa → modalità `place`).
- `components/MapCanvas.vue` — rendering canvas delle tre viste, zoom/pan via CSS transform, conversione click → coordinate di gioco (`mapX`/`mapZ`), disegno dei cluster pending.
- `components/DrawerTabs.vue` + `tabs/{InfoTab,ViewTab,ResourcesTab}.vue`, `components/CentralNavbar.vue` — UI presentazionale, comunicano solo via props/eventi.

## Gotcha

- Stringhe UI e log sono in **italiano**: mantienili tali.
- Lo slider dell'acqua usa una scala con offset: valore UI = `Height` XML − 20 (`initializeWaterLevel`).
- Le coordinate di gioco sono `x`/`z` (piano) — `y` è la rotazione dell'entità. Nel canvas la conversione click→gioco deve tenere conto di zoom e pan: se tocchi quelle formule, verifica sia `handleMapClick` sia il disegno dei cluster (usano la stessa trasformazione, in direzioni opposte).
- Se modifichi la logica dei moduli in `backend/`, controlla con `diff` se la modifica va replicata nelle copie alla radice del repo (e viceversa); per `RESOURCE_TYPES` anche in `useResourceManagement.js`.
- `_edited.xml` viene sovrascritto a ogni save; i file originali mai.

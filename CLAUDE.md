# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Node.js tooling for editing [0 A.D.](https://play0ad.com/) RTS game maps. Two surfaces share the same core logic:

1. **Root-level CLI** (`/populate-map.js` + `*-utils.js`) — batch-populates a map with terrain-aware resource clusters.
2. **Web editor** (`0ad-editor/`) — Vue 3 frontend + Express backend for visual heightmap/texture viewing and click-to-place resource clusters.

A map is always a pair of files with the same basename in a `maps/` directory:
- `<name>.pmp` — binary heightmap + terrain textures
- `<name>.xml` — scenario file (entities, players, environment) parsed via `xml2js`

Everything is ESM (`"type": "module"`). Requires Node with `readUInt16LE`/`readFloatLE` buffer support (any modern Node).

## Reference (`reference/`)

Authoritative notes on the 0 A.D. binary/scenario formats, derived from the game **source code** (the Trac dev wiki is behind an anti-bot and can't be fetched automatically). Consult these before touching PMP parsing or heightmap math:
- `reference/pmp-format.md` — full `.pmp` (PSMP) layout: 12-byte `FileHeader` + `mapSize` + `u16` heightmap + texture-name table + `STileDesc[]`; terrain constants (`HEIGHT_UNITS_PER_METRE = 92`, `PATCH_SIZE = 16`, `TERRAIN_TILE_SIZE = 4`); coordinate system.
- `reference/territory-performance.md` — diagnosis (an **engine bug**, not a bug in this tool) of the freeze on a very large map past a Civic Center threshold. Root cause **confirmed against the source**: a **`u16` integer overflow** of the territory cell counters in `CCmpTerritoryManager`. Both `std::vector<u16> m_TerritoryCellCounts` and `u16 m_TerritoryTotalPassableCellCount` saturate at 65 535; on a map whose **passable cells exceed 65 536** (side > 256 tiles / > 16 patches — e.g. `world` = 64 patches = 1024 tiles = 1 048 576 cells) the denominator wraps mod 65536, so in `GetTerritoryPercentage` `(cells*100)/total` can exceed 100 → **failed assertion** `ENSURE(percentage <= 100)` → engine blocks the main thread on an error dialog (`debug_DisplayError` → `sleep`), CPU ~0%. **Fix upstream:** widen both counters to `u32`. Each assertion forks an orphan `pyrogenesis` child (explains post-freeze stutter + leftover processes; clean with `pkill -9 -f MacOS/pyrogenesis`). A SIGSEGV after a freeze is **a downstream consequence of the freeze, not an independent renderer bug** — it appears ONLY in sessions that had frozen (game resumes from a degraded GPU/command-buffer state), never on clean runs; fixing the `u16` overflow should make it disappear. **Empirically verified that Vulkan does NOT fix it — it only moves the crash site**: with `rendererbackend = "vulkan"` the freeze is identical (CPU ~0%, RSS stable, no swap) and the SIGSEGV relocates from the OpenGL teardown (`CMiniMapTexture::~CTexture` → AppleMetalOpenGLRenderer) into `CRenderer::RenderFrame → CSwapChain::AcquireNextImage → vkAcquireNextImageKHR → libMoltenVK → IOGPU`. That the crash follows the backend proves it's the post-freeze degraded state, not a specific renderer. Vulkan is **not** a workaround. NB: earlier hypotheses were wrong — territory-computation cost / issue #2360 and pathfinder load were background noise; and the numerator does **not** count impassable cells (both numerator and denominator count only passable cells) — the defect is purely the 16-bit type.
- `reference/sources.md` — all upstream URLs (GitHub mirror `github.com/0ad/0ad`, Gitea, Trac wiki, release notes). The Gitea issue tracker is queryable via `GET /api/v1/repos/0ad/0ad/issues?...&q=<term>` (note: `q` effectively matches issue **titles** only).

**Engine source clone (for the `u16`-overflow fix):** `~/app/0ad-engine` — a clone of the C++ engine (`pyrogenesis`) checked out to apply and build-test the territory-manager fix. Its own `~/app/0ad-engine/CLAUDE.md` holds the exact line numbers (`CCmpTerritoryManager.cpp` L120/121/490), the `u16`→`u32` patch, and the full macOS Apple-Silicon build procedure (CLT-only, `--without-atlas`, `make`). Separate repo from this tooling — do not confuse `~/app/0ad` (Node tooling) with `~/app/0ad-engine` (game engine).

Format version is `FILE_VERSION = 7` (`source/graphics/MapIO.h`), **unchanged between game Release 27 and 28 "Boiorix"**. The game-release number (27/28) is *not* the `.pmp` format version.

## Known bugs (in both copies of `pmp-utils.js`, root + `0ad-editor/backend/` — files are identical)

Verified against upstream source; **not yet fixed**:

1. **Height scaling has a spurious −20 m offset** (`readPmpNewFormat`, `alt = (rawAlt / 65535) * 712 - 20`). Upstream is simply `metres = raw_u16 / 92` (`HEIGHT_UNITS_PER_METRE`), no offset. The multiplier happens to be near-correct (`712/65535 ≈ 1/92`) but every altitude ends up ~20 m too low, shifting `getAltitudeStats`, editor elevation range, `altWaterThreshold`, and `pickTemplate` elevation bands. **Fix:** `const alt = rawAlt / 92;`. Fixing this raises altitudes ~20 m, so re-check the editor water-level slider (`useUIState.initializeWaterLevel`, which already offsets by −20).
2. **Texture tiles read with wrong stride** (`parseTextureData`). Each tile is a `STileDesc` = **8 bytes** (`u16 m_Tex1Index; u16 m_Tex2Index; u32 m_Priority;`, `#pragma pack(1)`), but the code reads a single `UInt16` and advances 2. The primary texture index is `m_Tex1Index` (first 2 bytes); advance **8** bytes per tile and set `bytesNeeded = tilesPerSide² × 8`. Affects only the editor's texture view (CLI placement uses altitude, not textures).

Non-urgent: `getMapDimensions` / `readPmpOldFormat` assume the legacy v25 64-byte-header Float32 layout — unreliable for PSMP maps (see the ⚠️ under CLI resource population).

## Commands

### Web editor (primary workflow)
```bash
cd 0ad-editor
npm run setup      # installs backend + frontend deps
npm run dev        # runs backend (3001) + frontend (3000) concurrently
```
- Frontend dev server: http://localhost:3000 (Vite; proxies `/api/*` → `http://localhost:3001`)
- Backend API: http://localhost:3001
- Run one side only: `npm run backend` / `npm run frontend`
- Frontend prod build: `cd 0ad-editor/frontend && npm run build`

### CLI resource population
```bash
# from repo root OR 0ad-editor/backend (both hold copies of the scripts + maps/)
node populate-map.js <map_name> [map_dimension]   # argument mode
node populate-map.js                              # interactive mode (inquirer prompts)
```
Reads `maps/<name>.{pmp,xml}`, writes `maps/<name><suffix>.xml` (`outputSuffix` from `.0ad-config.json`; default `_populated`, currently set to `_p`).

⚠️ In argument mode, if `map_dimension` is omitted the CLI calls `getMapDimensions()`, which **assumes the legacy 64-byte-header Float32 layout** — for v27 `PSMP` maps it returns a wrong size, so pass `map_dimension` explicitly (side = patches × 16 × 4).

### Tests / lint
There is **no test runner or linter configured**. Root `npm test` intentionally fails. `test-texture-parsing.js` and `test-uint16.js` are standalone diagnostic scripts run directly with `node <file>.js`, not a suite.

## Architecture

### Core module layer (`*-utils.js` + `resource-config.js`)
These are duplicated in **two locations** — repo root and `0ad-editor/backend/`. The web backend imports its local copies; the CLI imports the root copies. **A logic change usually needs to be made in both places** (verify with `diff`). The copies have **already diverged** — as of now `pmp-utils.js`, `map-utils.js`, `populate-map.js` and `config-manager.js` are identical, but:

- `xml-utils.js`: root `createEntity(template, player, x, z, uid)` adds a `Player` element and a random `Orientation`; backend `createEntity(template, rotation, x, z, uid)` takes an explicit rotation and **omits `Player`** (Gaia resources).
- `resource-config.js`: `RESOURCE_TYPES` and `generateResourceCluster()` exist **only in the backend copy**; the root copy has only the CLI constants (`TROPICAL_TREES`, `ROCKS`, …) and `pickTemplate()`.
- `cli-utils.js`: water-threshold validation range differs (root 0–450, backend 0–50).

Key modules:

- **`pmp-utils.js`** — `readPmp()` auto-detects PMP format by the 4-byte magic header:
  - No `PSMP` magic → legacy 0AD v25 Float32 heightmap (`readPmpOldFormat`); texture parsing is not implemented for this format.
  - `PSMP` magic → v27+ UInt16 format (`readPmpNewFormat`): 16-byte header (magic/version/dataSize/mapSize-in-patches), then a `(mapSize*16+1)²` grid of UInt16 heights scaled to −20..+692 m, then texture-name table + per-tile texture indices (`parseTextureData`).
  - Grid vs. game coordinates: a map is `mapSize` patches; each patch is 16 tiles; each tile 4 game units → side length `mapSize*16*4` game units.
- **`xml-utils.js`** — thin `xml2js` wrapper. `loadXmlMap`/`saveXmlMap` round-trip the scenario. `createEntity()` builds an entity with `Template`/`Position`/`Orientation`/`Actor`; the backend copy omits `Player` (Gaia), the root copy includes it (the CLI passes `player = 0`). All entities live under `Scenario.Entities[0].Entity`.
- **`map-utils.js`** — coordinate + geometry helpers: `generatePositions` (cluster scatter), `findCivilCenters`, `getAltitudeAt` (game→grid sampling), `getAltitudeStats`, `distance`, `gameToGridCoords`.
- **`resource-config.js`** — backend copy: `RESOURCE_TYPES` (5 types — alpine/mediterranean/tropical forest, stones, metals — each with 0AD template paths, color, default density/radius/count) drives the web UI, and `generateResourceCluster()` scatters entities in a disc (effective radius = radius × density). Both copies: `pickTemplate(alt)` implements the CLI's **elevation-banded** placement (<10 m tropical trees/fauna, <40 m temperate trees/fauna, else rocks/metal). The frontend keeps **its own hardcoded copy** of `RESOURCE_TYPES` (minus templates) in `useResourceManagement.js` — keep the three in sync.

### CLI flow (`populate-map.js`)
Load PMP+XML → collect existing entities and Civil Centers → `generatePositions` → reject each candidate that is out of bounds, within `exclusionRadius` of a Civil Center, or at/below `altWaterThreshold` → pick a template by elevation → append entities → save. Parameters come from `.0ad-config.json` (persisted by `config-manager.js`) and, in interactive mode, from `cli-utils.js` prompts.

### Backend API (`0ad-editor/backend/server.js`, Express on 3001)
- `GET /api/maps` — lists basenames that have **both** `.pmp` and `.xml` in `maps/`.
- `GET /api/maps/:name` — returns `{ heightmap:{size,mapDim,altitudes}, textures, scenario }`.
- `POST /api/maps/:name/place-resources` — server-side single-cluster placement, writes `<name>_edited.xml`.
- `POST /api/maps/:name/save-with-resources` — reloads the **original** `.xml`, appends all pending clusters, writes `<name>_edited.xml`. This is the path the frontend "save" uses.
- `POST /api/maps/:name/save` — saves scenario metadata only.
- `POST /api/upload` — multer upload of a `.pmp`+`.xml` pair into `maps/`.
- `GET /api/textures/:name` — texture names + tile-grid size for a map.
- New entity UIDs start at `max(1000, maxExistingUID+1)` to avoid colliding with the scenario's player units. (The CLI instead uses `entities.length + 100`, which **can collide** with existing UIDs.)
- Edits are always written to a new `_edited.xml` (or `_p.xml` for the CLI); originals are never overwritten.

### Frontend (`0ad-editor/frontend/`, Vue 3 + Vite + Tailwind)
- Entry `main.js` → `App.vue` → router: both `/` and `/:mapName?` render `views/MapEditor.vue`. `views/Home.vue` (map list + upload UI) exists but is **not routed** — it's currently unreachable dead code.
- Selected map persists in `localStorage` (`selectedMapName`) and can be deep-linked via `/:mapName`.
- State is organized as **composables**, not a Pinia store, despite Pinia being a dependency:
  - `useMapManagement.js` — map list/loading, selected map, elevation range, `axios` calls to `/api`.
  - `useResourceManagement.js` — resource types, pending cluster list, save calls.
  - `useUIState.js` — view mode (heightmap/texture/entities), water level, beach/hills thresholds, interaction mode (navigate/place), toasts.
- `MapEditor.vue` wires these together and adds `enhanced*` wrappers that cross-cut composables (e.g. selecting a resource auto-switches to "place" mode). Presentational components: `MapCanvas.vue` (canvas rendering + click→game-coords), `DrawerTabs.vue` + `components/tabs/*`, `CentralNavbar.vue`.
- Placement is **staged client-side** as `pendingResourceClusters`; nothing is written until the user saves, which posts to `save-with-resources`.

## Conventions & gotchas
- Logs and user-facing strings are largely **Italian**; match that when editing them.
- Coordinate axes are 0AD's: `x` and `z` (not y) are the ground plane; `y` orientation is entity rotation.
- When touching heightmap math, keep grid-index vs. game-unit conversions straight — mixing them silently misplaces entities.
- The editor's water-level slider works on an **offset scale**: UI value = XML `WaterBody/Height` − 20 (see `useUIState.initializeWaterLevel`).
- `maps/` in the repo root and in `0ad-editor/backend/` are separate directories with overlapping but non-identical contents.

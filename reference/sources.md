# Riferimenti esterni — 0 A.D.

## Codice sorgente

- **Mirror GitHub** (consultabile/fetchabile senza login): <https://github.com/0ad/0ad>
  - `source/graphics/MapIO.h` — `FILE_VERSION`, `STileDesc`
    <https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/MapIO.h>
  - `source/graphics/MapReader.cpp` — logica di lettura `.pmp` (`UnpackTerrain`)
    <https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/MapReader.cpp>
  - `source/graphics/Terrain.h` — `HEIGHT_UNITS_PER_METRE`, `HEIGHT_SCALE`, `TERRAIN_TILE_SIZE`
    <https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/Terrain.h>
  - `source/graphics/Patch.h` — `PATCH_SIZE`
    <https://raw.githubusercontent.com/0ad/0ad/master/source/graphics/Patch.h>
  - `source/ps/FileIo.h` / `FileIo.cpp` — header file (`FileHeader`, 12 byte)
    <https://raw.githubusercontent.com/0ad/0ad/master/source/ps/FileIo.cpp>
- **Repo ufficiale (Gitea)**: <https://gitea.wildfiregames.com>

## Issue tracker (Gitea API)

- Interrogabile senza login: `GET https://gitea.wildfiregames.com/api/v1/repos/0ad/0ad/issues?type=issues&state=all&limit=20&q=<term>`
  - ⚠️ Il parametro `q` matcha di fatto solo parole del **titolo**; query multi-parola sul corpo tornano vuote.
- Issue **#2360 "Speed up territory computation"** — <https://gitea.wildfiregames.com/0ad/0ad/issues/2360>
  (ipotesi iniziale sul freeze, poi **smentita**: vedi `territory-performance.md`).
- Issue **#3321 "[PATCH] Add ability to query percentage of map controlled"** —
  <https://gitea.wildfiregames.com/0ad/0ad/issues/3321> — la feature-patch che **introdusse**
  `GetTerritoryPercentage` (origine del codice affetto dall'overflow).
- Nessun ticket Gitea copre l'overflow `u16` / l'assertion `ENSURE(percentage<=100)` (ricerca per
  titolo su territory/percentage/overflow/u16/large map — solo risultati non pertinenti).
- Sorgente della funzione colpevole del freeze:
  `source/simulation2/components/CCmpTerritoryManager.cpp` → `GetTerritoryPercentage`
  (causa reale: contatori `m_TerritoryCellCounts` / `m_TerritoryTotalPassableCellCount` dichiarati
  `u16`, vanno in overflow su mappe > 256 tile/lato).

## Documentazione sviluppatori

- **Trac wiki**: <https://trac.wildfiregames.com/wiki> — ⚠️ protetta da anti-bot (Anubis),
  NON fetchabile in automatico. Aprire manualmente da browser. Pagine utili: `Maps`, `Atlas_Manual`.
- **Forum**: <https://wildfiregames.com/forum/>

## Release

- Release 28 "Boiorix" (18 feb 2026): <https://play0ad.com/new-release-0-a-d-release-28-boiorix/>
- Nessuna modifica al formato mappa/heightmap/XML rispetto alla 27.

## Note

- Versione formato `.pmp` (PSMP) = **7**, stabile tra release 27 e 28.
- Per aggiornamenti tra release conviene monitorare i **path dei template** delle entità
  (`gaia/...`), che possono essere rinominati, più che il formato binario.

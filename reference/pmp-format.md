# Formato mappa 0 A.D. — `.pmp` (PSMP)

> Reference ricavato dal **codice sorgente** di 0 A.D. (branch `master`, valido per Release 27 e 28
> "Boiorix"). La wiki Trac degli sviluppatori è dietro un anti-bot (Anubis) e non è consultabile
> in automatico, quindi la fonte primaria qui è il sorgente C++. Vedi `sources.md` per gli URL.

## Versione del formato

- `FILE_VERSION = 7` e `FILE_READ_VERSION = 7` (`source/graphics/MapIO.h`).
- **Invariato tra Release 27 e 28**: le release note della 28 non menzionano modifiche a formato
  mappa/heightmap/XML. Il numero "27/28" è la **release del gioco**, NON la versione del formato
  `.pmp` (che è 7 da diverse release).
- File con versione `< 7` vengono rifiutati dal gioco (`too old version`).

## Costanti di terreno (`source/graphics/Terrain.h`)

| Costante | Valore | Significato |
|---|---|---|
| `PATCH_SIZE` | `16` | tile per lato di un patch (`source/graphics/Patch.h`) |
| `TERRAIN_TILE_SIZE` | `4` | unità di gioco (metri) per lato di un tile |
| `HEIGHT_UNITS_PER_METRE` | `92` | unità u16 di altezza per metro |
| `HEIGHT_SCALE` | `1 / 92` | metri per unità u16 |

**Conversione altezza corretta:** `metri = raw_u16 / 92`.
Nessun offset. Range risultante: `0 .. 65535/92 ≈ 712 m`. Non esistono altitudini negative nel
formato; il livello dell'acqua è un valore separato nell'XML (`WaterBody/Height`, default ~20 m).

## Sistema di coordinate

- Una mappa è `mapSize` patch per lato.
- Vertici heightmap per lato: `mapSize * PATCH_SIZE + 1` = `mapSize*16 + 1`.
- Tile per lato: `mapSize * PATCH_SIZE` = `mapSize*16`.
- Lato mappa in unità di gioco: `mapSize * 16 * 4`.
- Piano di terra: assi `x` e `z` (non `y`). `y` è verticale / orientamento entità.

## Layout binario del file

Header comune del serializzatore `CFileUnpacker` (`source/ps/FileIo.{h,cpp}`), little-endian:

```
struct FileHeader {           // sizeof == 12 (cassert nel sorgente)
    char magic[4];            // "PSMP"
    u32  version_le;          // == 7
    u32  payloadSize_le;      // dimensione del payload che segue
};
```

Payload (letto da `CMapReader::UnpackTerrain` in `source/graphics/MapReader.cpp`):

| Offset | Tipo | Campo |
|---|---|---|
| 0  | `char[4]` | magic `"PSMP"` |
| 4  | `u32` | version (7) |
| 8  | `u32` | payloadSize |
| 12 | `u32` | **mapSize** (patch per lato) — `UnpackSize()` |
| 16 | `u16[ (mapSize*16+1)² ]` | heightmap (row-major) |
| …  | `u32` | `numTextures` — `UnpackSize()` |
| …  | `numTextures × { u32 len; char[len] }` | nomi texture (stringhe length-prefixed) |
| …  | `STileDesc[ (mapSize*16)² ]` | descrittori tile (row-major) |

### `STileDesc` — 8 byte per tile (`source/graphics/MapIO.h`, `#pragma pack(1)`)

```c
struct STileDesc {
    u16 m_Tex1Index;   // indice nella tabella nomi texture (base)
    u16 m_Tex2Index;   // indice texture di blend
    u32 m_Priority;    // priorità di blend
};
```

> ⚠️ Ogni tile occupa **8 byte**, non 2. L'indice texture principale è `m_Tex1Index` (primi 2 byte),
> poi si avanza di 8 byte. Leggere 2 byte per tile disallinea completamente la griglia texture.

# Freeze con molti Civic Center — diagnosi MISURATA

> **Aggiornato con dati empirici** raccolti profilando il gioco dal vivo su questa macchina
> (macOS/Apple Silicon, 0 A.D. Release 28). La versione precedente di questo file attribuiva il
> freeze al *costo di calcolo del territorio* (issue #2360): **quell'ipotesi era sbagliata.** Vedi
> sotto la causa reale, confermata dagli stack trace.

## Sintomo

Su mappa **molto grande** e ricca di risorse, il gioco **si blocca ~5 s** raggiungendo una certa
soglia di Civic Center (tipicamente costruendo/**catturando** un nuovo CC). Dopo il primo blocco il
gioco procede **a scatti**.

## Causa radice: **overflow `u16`** dei contatori di territorio (verificata sul sorgente)

> **Correzione rispetto a una diagnosi intermedia.** Una prima analisi attribuiva lo sforamento al
> fatto che il *numeratore contasse celle impassabili*: **è falso**. Nel sorgente attuale sia il
> numeratore sia il denominatore contano **solo celle passabili**. Il vero difetto è un **overflow
> di tipo intero a 16 bit** sui contatori, che scatta solo su mappe molto grandi.

Durante il freeze la **CPU è ~0%**, non 100%: **non è un calcolo** (né territorio né pathfinder,
che invece saturano la CPU) — il processo è **in attesa** sul dialog d'errore. Stack del main-thread:

```
CSimulation2Impl::Update → CComponentManager::BroadcastMessage
 → CCmpTerritoryManager::HandleMessage → (script JS) → GetTerritoryPercentage(player)
   → CCmpTerritoryManager::GetTerritoryPercentage(int)
     → debug_OnAssertionFailure → debug_DisplayError → sys_display_error
       → sleep → nanosleep → __semwait_signal     ◀── il gioco DORME qui
```

**Assertion che fallisce** (`source/simulation2/components/CCmpTerritoryManager.cpp`):

```cpp
u8 CCmpTerritoryManager::GetTerritoryPercentage(player_id_t player)
{
    if (player <= 0 || (m_Territories && (size_t)player >= m_TerritoryCellCounts.size()))
        return 0;
    CalculateTerritories();
    if (m_TerritoryTotalPassableCellCount == 0 || (size_t)player >= m_TerritoryCellCounts.size())
        return 0;
    u8 percentage = (m_TerritoryCellCounts[player] * 100) / m_TerritoryTotalPassableCellCount;
    ENSURE(percentage <= 100);   // ◀── QUESTA fallisce → dialog d'errore → freeze
    return percentage;
}
```

I due contatori coinvolti sono dichiarati **a 16 bit**:

```cpp
std::vector<u16> m_TerritoryCellCounts;        // celle passabili per giocatore
u16              m_TerritoryTotalPassableCellCount; // celle passabili totali della mappa
```

- Il **denominatore** (`m_TerritoryTotalPassableCellCount`) è incrementato in `CalculateCostGrid()`
  una volta per ogni cella passabile della mappa. Un `u16` **satura a 65.535**.
- Il **numeratore** (`m_TerritoryCellCounts[player]`) è incrementato nel floodfill di
  `CalculateTerritories()` solo per celle **passabili** connesse (`cost < m_ImpassableCost`), con
  protezione anti-doppia-conta (`TERRITORY_CONNECTED_MASK`). Anche questo è `u16`.

**Meccanismo dell'overflow.** Se le celle passabili totali superano **65.536**, il denominatore
**wrappa** (mod 65536) a un valore piccolo e insensato. Il numeratore per-giocatore, crescendo con
i CC catturati, scavalca quel denominatore wrappato → `percentage > 100` → assertion → dialog →
freeze. Non c'entra l'impassabilità: è puro **overflow del tipo**.

**Perché serve una mappa «davvero grande».** Lato mappa in tile = `patches × 16`; celle = lato².
Il wrap avviene per lato **> 256 tile** (`> 16 patch`). Le mappe standard (≤256 tile) **non** lo
triggerano mai. La mappa `world` di questo repo è **64 patch = 1024 tile/lato = 1.048.576 celle**,
~16× il limite `u16` → overflow garantito.

**«Soglia ~20 CC».** È il punto in cui il territorio passabile di *quel* giocatore (numeratore)
supera il denominatore wrappato: dipende da quanto vale `celle_passabili mod 65536` per la mappa.

Il chiamante è uno **script JS** invocato via `HandleMessage` del TerritoryManager (probabile GUI
"% mappa controllata" o una **condizione di vittoria** basata sul territorio). Ogni ricorrenza forka
un processo-figlio per il dialog d'errore (vedi sotto).

### Fix upstream
Portare i due contatori a 32 bit:

```cpp
std::vector<u32> m_TerritoryCellCounts;
u32              m_TerritoryTotalPassableCellCount;
```

più il loop di reset in `CalculateTerritories()` (`for (u32& count : m_TerritoryCellCounts) count = 0;`).
Con `u32` il limite sale a ~4,29 miliardi di celle, irraggiungibile. Nessun ticket Gitea dedicato
(ricerca per titolo su `territory/percentage/overflow/u16/large map`); l'unico correlato è **#3321**,
la feature-patch che *introdusse* `GetTerritoryPercentage`.

### Nota: assertion abilitate in questa build
Il freeze richiede `debug_OnAssertionFailure` presente → la build macOS in uso ha le **assertion
attive**. Con `NDEBUG` la funzione restituirebbe un valore >100 senza bloccare, ma il dato di %
territorio resterebbe comunque errato (denominatore wrappato).

## Effetto collaterale: processi orfani + scatti

Ogni volta che l'assertion scatta, l'engine **forka un processo-figlio** per mostrare l'errore
(`debug_DisplayError`); questi figli restano **orfani** (reparented a `launchd`, PPID 1), 0% CPU,
pochi MB. Si accumulano (una coppia per evento) e spiegano il "tutto a scatti" dopo il primo freeze.
Sono innocui ma vanno ripuliti: `for p in $(pgrep -f 'MacOS/pyrogenesis'); do kill -9 $p; done`.

## Crash all'uscita dal match — **conseguenza del freeze**, non bug indipendente (Apple Silicon)

> **Correzione.** Prima documentato come crash *separato e indipendente* del backend OpenGL. Dato
> empirico dell'utente: questo SIGSEGV **compare SOLO nelle sessioni che si erano freezate** (con
> quit forzato tra un lag e l'altro); negli scenari normali, uscita sempre pulita. Quindi è quasi
> certamente un **effetto a valle del freeze**, non un difetto che scatta a ogni uscita.

All'uscita/`EndGame` dopo un freeze, SIGSEGV nel driver grafico Apple durante il teardown texture:

```
JS Script_EndGame → EndGame() → CGame::~CGame() → CGameView::~CGameView()
 → CMiniMapTexture::~CTexture() → glDeleteTextures
   → AppleMetalOpenGLRenderer → AGXMetalG14X::Texture::~Texture()   ← SIGSEGV
```

**Perché.** Dopo il freeze il gioco è in stato degradato (assertion ripetute, processi-figlio
forkati, **quit forzato** non pulito); il teardown delle texture parte da uno stato già compromesso
e il layer GL→Metal di Apple ci crasha. Non riproducibile senza il freeze a monte.

**Implicazione.** La causa primaria unica è l'**overflow `u16`**: correggendolo, il crash d'uscita
dovrebbe sparire da solo.

### Verifica empirica: Vulkan NON risolve, sposta solo il crash
Riprodotto il freeze con `rendererbackend = "vulkan"` attivo. Risultato:
- **Il freeze è identico** (stesso stack `GetTerritoryPercentage → debug_OnAssertionFailure →
  nanosleep`; CSV: CPU ~0% per ~6s, RSS stabile ~3 GB, swap 0). Confermato: il renderer non c'entra
  col freeze, ed è escluso qualsiasi problema di memoria.
- **Il crash post-freeze c'è ancora**, ma il **sito è cambiato**: non più teardown OpenGL→Metal, ora
  dentro il rendering normale via MoltenVK:
  ```
  CRenderer::RenderFrame → CDevice::AcquireNextBackbuffer → CSwapChain::AcquireNextImage
   → vkAcquireNextImageKHR → libMoltenVK → AGXMetalG14X command buffer
     → IOGPU _iogpuMetalCommandBufferStorageSetupShmems → SIGSEGV
  ```
- Che **cambiando backend il crash si sposti** (OpenGL teardown → MoltenVK RenderFrame) conferma che
  **non è un bug di uno specifico renderer**: è lo **stato GPU/command-buffer degradato dopo il
  freeze** a far saltare qualunque backend. Coerente col dato utente ("crash solo nelle sessioni
  freezate").

**Conclusione:** Vulkan **non è un workaround per il crash**. L'unico fix reale è l'overflow `u16`
(elimina il freeze → niente stato degradato → niente crash).

## Mitigazioni per il freeze (in ordine di efficacia)

1. **Fix upstream** (definitivo): `u16` → `u32` sui due contatori (vedi sopra). Elimina l'overflow.
2. **Usare mappe ≤ 256 tile/lato** (≤ 16 patch): sotto quella soglia il `u16` non wrappa mai.
3. **Disattivare la condizione di vittoria basata sul territorio** (se è il chiamante): elimina la
   query a `GetTerritoryPercentage` senza toccare il motore. *(Da confermare quale script chiama.)*
4. Palliativo non risolutivo: clampare `percentage` a 100 — ferma l'assertion ma lascia il dato di
   % territorio errato (il denominatore resta wrappato). Preferire il fix `u32`.

## Nota di ricerca

La wiki Trac e il fandom sono dietro anti-bot/paywall per il fetch automatico. L'issue tracker Gitea
è interrogabile via API (`/api/v1/repos/0ad/0ad/issues?...&q=...`), ma `q` matcha di fatto solo i
**titoli**. Vedi `sources.md`.

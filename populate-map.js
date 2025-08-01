import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { readPmp, getMapDimensions } from './pmp-utils.js';

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

if (process.argv.length < 3) {
  console.error('❌ Uso: node populate-map.js <nome_mappa> [mapDimension]');
  process.exit(1);
}

const mapName = process.argv[2];
const customMapDim = process.argv[3] ? parseInt(process.argv[3]) : null;
const MAPS_DIR = './maps';
const XML_FILE = path.join(MAPS_DIR, `${mapName}.xml`);
const PMP_FILE = path.join(MAPS_DIR, `${mapName}.pmp`);
const OUTPUT_FILE = path.join(MAPS_DIR, `${mapName}_p.xml`);

/* ✅ PARAMETRI CONFIGURABILI */
// MAP_DIM sarà calcolato dinamicamente dal file .pmp
const CLUSTER_COUNT = 200; // numero di cluster di risorse
const CLUSTER_RADIUS = 50; // raggio del cluster
const RESOURCES_PER_CLUSTER = 10; // risorse aggiuntive per cluster (oltre quella centrale)
const ALT_WATER_THRESHOLD = 5; // livello del mare 0AD: ~20m, ma usiamo margine sicurezza
const EXCLUSION_RADIUS = 300; // raggio di esclusione intorno ai Civil Centers

/* ✅ LISTE DI ENTITÀ (path validi) */
// Pianura bassa / coste
const TROPICAL_TREES = ['gaia/tree/medit_fan_palm', 'gaia/tree/mangrove'];
const TROPICAL_FAUNA = ['gaia/fauna_goat', 'gaia/fauna_chicken'];

// Colline / foreste temperate
const TEMPERATE_TREES = ['gaia/tree/oak', 'gaia/tree/oak_aut', 'gaia/tree/maple_autumn', 'gaia/tree/juniper_prickly'];
const TEMPERATE_FAUNA = ['gaia/fauna_deer', 'gaia/fauna_rabbit'];

// Montagna
const ROCKS = ['gaia/rock/temperate_large_03', 'gaia/rock/mediterranean_large'];
const METALS = ['gaia/ore/temperate_large', 'gaia/ore/temperate_small'];

/* ✅ FUNZIONI */


// Crea entità XML
function createEntity(template, player, x, z, uid) {
  return {
    $: { uid },
    Template: [template],
    Player: [player.toString()],
    Position: [{ $: { x: x.toFixed(4), z: z.toFixed(4) } }],
    Orientation: [{ $: { y: (Math.random() * Math.PI * 2).toFixed(5) } }],
    Actor: [{ $: { seed: Math.floor(Math.random() * 60000).toString() } }]
  };
}

// Random da lista
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Scegli entità in base a altitudine
function pickTemplate(alt) {
  if (alt < 10) {
    return Math.random() < 0.7 ? pickRandom(TROPICAL_TREES) : pickRandom(TROPICAL_FAUNA);
  } else if (alt < 40) {
    return Math.random() < 0.6 ? pickRandom(TEMPERATE_TREES) : pickRandom(TEMPERATE_FAUNA);
  } else {
    return Math.random() < 0.7 ? pickRandom(ROCKS) : pickRandom(METALS);
  }
}

// Genera posizioni cluster con controllo confini
function generatePositions(mapDim, count, clusterRadius, resourcesPerCluster) {
  const positions = [];
  const margin = clusterRadius; // margine dai bordi
  
  for (let i = 0; i < count; i++) {
    // Genera centro cluster con margine di sicurezza
    const x = margin + Math.random() * (mapDim - 2 * margin);
    const z = margin + Math.random() * (mapDim - 2 * margin);
    positions.push({ x, z });
    
    // Genera risorse nel cluster, controllando confini
    for (let c = 0; c < resourcesPerCluster; c++) {
      let newX, newZ, attempts = 0;
      do {
        newX = x + (Math.random() - 0.5) * clusterRadius;
        newZ = z + (Math.random() - 0.5) * clusterRadius;
        attempts++;
      } while ((newX < 0 || newX >= mapDim || newZ < 0 || newZ >= mapDim) && attempts < 10);
      
      // Solo se in confini validi
      if (newX >= 0 && newX < mapDim && newZ >= 0 && newZ < mapDim) {
        positions.push({ x: newX, z: newZ });
      }
    }
  }
  return positions;
}

// Calcola distanza tra due punti
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

// Mappa coordinate game → indici griglia altitudini
function gameToGridCoords(gameX, gameZ, mapDim, gridSize) {
  // Coordinate game: 0 → mapDim
  // Indici griglia: 0 → gridSize-1
  const i = Math.floor((gameZ / mapDim) * gridSize);
  const j = Math.floor((gameX / mapDim) * gridSize);
  
  // Clamp per sicurezza
  return {
    i: Math.max(0, Math.min(gridSize - 1, i)),
    j: Math.max(0, Math.min(gridSize - 1, j))
  };
}

// Ottieni altitudine per coordinate game
function getAltitudeAt(gameX, gameZ, altitudes, mapDim) {
  const { i, j } = gameToGridCoords(gameX, gameZ, mapDim, altitudes.length);
  return altitudes[i][j];
}

(async () => {
  console.log(`📥 Carico mappa: ${mapName}`);
  const xmlData = fs.readFileSync(XML_FILE, 'utf8');
  const { altitudes, size } = readPmp(PMP_FILE);
  const mapDim = customMapDim || getMapDimensions(PMP_FILE);
  const result = await parser.parseStringPromise(xmlData);

  // Gestisci Entities vuoto o mancante
  if (!result.Scenario.Entities[0] || typeof result.Scenario.Entities[0] === 'string') {
    result.Scenario.Entities[0] = {};
  }
  const entities = result.Scenario.Entities[0].Entity || [];
  let uidCounter = entities.length + 100;

  if (customMapDim) {
    console.log(`✅ Mappa caricata (${size}x${size}), dimensioni personalizzate: ${mapDim}, entità iniziali: ${entities.length}`);
  } else {
    console.log(`✅ Mappa caricata (${size}x${size}), dimensioni rilevate: ${mapDim}, entità iniziali: ${entities.length}`);
  }

  // Debug: trova min/max altitudini
  let minAlt = Infinity, maxAlt = -Infinity;
  altitudes.forEach(row => row.forEach(alt => {
    minAlt = Math.min(minAlt, alt);
    maxAlt = Math.max(maxAlt, alt);
  }));
  console.log(`🏔 Altitudini: min=${minAlt.toFixed(2)}, max=${maxAlt.toFixed(2)}, soglia acqua=${ALT_WATER_THRESHOLD}`);
  
  // Debug: campiona alcune celle per verificare dati
  console.log(`🎯 Campioni altitudini:`);
  for (let test = 0; test < 5; test++) {
    const i = Math.floor(Math.random() * size);
    const j = Math.floor(Math.random() * size);
    console.log(`  Griglia(${i}, ${j}) = ${altitudes[i][j].toFixed(3)}`);
  }

  // Trova Civil Centers per escludere area
  const civilCenters = entities
    .filter(e => e.Template[0].includes('civil_centre'))
    .map(e => {
      const pos = e.Position[0].$;
      return { x: parseFloat(pos.x), z: parseFloat(pos.z) };
    });

  console.log(`🏛 Civil Centers trovati: ${civilCenters.length}`);

  const positions = generatePositions(mapDim, CLUSTER_COUNT, CLUSTER_RADIUS, RESOURCES_PER_CLUSTER);
  let added = 0;
  let rejectedCC = 0, rejectedBounds = 0, rejectedWater = 0;

  positions.forEach(pos => {
    // Controllo confini mappa
    if (pos.x < 0 || pos.x >= mapDim || pos.z < 0 || pos.z >= mapDim) {
      rejectedBounds++;
      return;
    }

    // Escludi vicino ai CC
    if (civilCenters.some(cc => distance(cc, pos) < EXCLUSION_RADIUS)) {
      rejectedCC++;
      return;
    }

    // Ottieni altitudine usando la nuova funzione
    const alt = getAltitudeAt(pos.x, pos.z, altitudes, mapDim);
    
    // Debug per i primi 5 rifiuti acqua
    if (alt <= ALT_WATER_THRESHOLD && rejectedWater < 5) {
      const { i, j } = gameToGridCoords(pos.x, pos.z, mapDim, altitudes.length);
      console.log(`💧 Water reject ${rejectedWater}: pos(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) → grid(${i}, ${j}) → alt=${alt.toFixed(3)}`);
    }
    
    // Escludi se in acqua (altitudine troppo bassa)
    if (alt <= ALT_WATER_THRESHOLD) {
      rejectedWater++;
      return;
    }

    const template = pickTemplate(alt);
    entities.push(createEntity(template, 0, pos.x, pos.z, uidCounter++));
    added++;
  });

  console.log(`📊 Debug: CC=${rejectedCC}, Bounds=${rejectedBounds}, Water=${rejectedWater}, Added=${added}`);

  result.Scenario.Entities[0].Entity = entities;

  const newXml = builder.buildObject(result);
  fs.writeFileSync(OUTPUT_FILE, newXml, 'utf8');

  console.log(`✅ Popolamento completato! Aggiunte ${added} nuove entità.`);
  console.log(`📏 Dimensioni mappa usate: ${mapDim}`);
  console.log(`📄 File salvato in: ${OUTPUT_FILE}`);
})();

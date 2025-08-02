import path from 'path';
import { readPmp, getMapDimensions } from './pmp-utils.js';
import { loadXmlMap, saveXmlMap, initializeEntities, createEntity } from './xml-utils.js';
import { 
  generatePositions, 
  findCivilCenters, 
  getAltitudeAt, 
  distance, 
  getAltitudeStats, 
  sampleAltitudes,
  gameToGridCoords
} from './map-utils.js';
import { 
  CLUSTER_COUNT, 
  CLUSTER_RADIUS, 
  RESOURCES_PER_CLUSTER, 
  ALT_WATER_THRESHOLD, 
  EXCLUSION_RADIUS,
  pickTemplate 
} from './resource-config.js';

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


(async () => {
  console.log(`📥 Carico mappa: ${mapName}`);
  const { altitudes, size } = readPmp(PMP_FILE);
  const mapDim = customMapDim || getMapDimensions(PMP_FILE);
  const result = await loadXmlMap(XML_FILE);

  const entities = initializeEntities(result.Scenario);
  let uidCounter = entities.length + 100;

  if (customMapDim) {
    console.log(`✅ Mappa caricata (${size}x${size}), dimensioni personalizzate: ${mapDim}, entità iniziali: ${entities.length}`);
  } else {
    console.log(`✅ Mappa caricata (${size}x${size}), dimensioni rilevate: ${mapDim}, entità iniziali: ${entities.length}`);
  }

  const { minAlt, maxAlt } = getAltitudeStats(altitudes);
  console.log(`🏔 Altitudini: min=${minAlt.toFixed(2)}, max=${maxAlt.toFixed(2)}, soglia acqua=${ALT_WATER_THRESHOLD}`);
  
  console.log(`🎯 Campioni altitudini:`);
  const samples = sampleAltitudes(altitudes, 5);
  samples.forEach(({ i, j, altitude }) => {
    console.log(`  Griglia(${i}, ${j}) = ${altitude.toFixed(3)}`);
  });

  const civilCenters = findCivilCenters(entities);

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

    const alt = getAltitudeAt(pos.x, pos.z, altitudes, mapDim);
    
    if (alt <= ALT_WATER_THRESHOLD && rejectedWater < 5) {
      const { i, j } = gameToGridCoords(pos.x, pos.z, mapDim, altitudes.length);
      console.log(`💧 Water reject ${rejectedWater}: pos(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) → grid(${i}, ${j}) → alt=${alt.toFixed(3)}`);
    }
    
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
  saveXmlMap(result, OUTPUT_FILE);

  console.log(`✅ Popolamento completato! Aggiunte ${added} nuove entità.`);
  console.log(`📏 Dimensioni mappa usate: ${mapDim}`);
  console.log(`📄 File salvato in: ${OUTPUT_FILE}`);
})();

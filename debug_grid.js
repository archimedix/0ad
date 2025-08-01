import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { getMapDimensions } from './pmp-utils.js';

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

if (process.argv.length < 3) {
  console.error('Usage: node debug-grid.js <mapName> [mapDimension]');
  process.exit(1);
}

const mapName = process.argv[2];
const customMapDim = process.argv[3] ? parseInt(process.argv[3]) : null;
const MAPS_DIR = './maps';
const XML_FILE = path.join(MAPS_DIR, `${mapName}.xml`);
const PMP_FILE = path.join(MAPS_DIR, `${mapName}.pmp`);
const OUTPUT_FILE = path.join(MAPS_DIR, `${mapName}_p.xml`);

const RESOURCE_TEMPLATE = 'gaia/tree/oak';
const STEP = 50;


function createEntity(template, player, x, z, uid) {
  return {
    $: { uid },
    Template: [template],
    Player: [player.toString()],
    Position: [{ $: { x: x.toFixed(4), z: z.toFixed(4) } }],
    Orientation: [{ $: { y: 0 } }],
    Actor: [{ $: { seed: 0 } }]
  };
}

(async () => {
  const MAP_DIM = customMapDim || getMapDimensions(PMP_FILE);
  if (customMapDim) {
    console.log(`📏 Dimensioni mappa personalizzate: ${MAP_DIM}`);
  } else {
    console.log(`📏 Dimensioni mappa rilevate: ${MAP_DIM}`);
  }
  
  const xmlData = fs.readFileSync(XML_FILE, 'utf8');
  const result = await parser.parseStringPromise(xmlData);
  
  // Gestisci Entities vuoto o mancante
  if (!result.Scenario.Entities[0] || typeof result.Scenario.Entities[0] === 'string') {
    result.Scenario.Entities[0] = {};
  }
  const entities = result.Scenario.Entities[0].Entity || [];
  const initialCount = entities.length;
  let uid = entities.length + 100;

  // Popola griglia regolare
  for (let x = 0; x <= MAP_DIM; x += STEP) {
    for (let z = 0; z <= MAP_DIM; z += STEP) {
      entities.push(createEntity(RESOURCE_TEMPLATE, 0, x, z, uid++));
    }
  }

  // Aggiunge anche su diagonale
  for (let d = 0; d <= MAP_DIM; d += STEP) {
    entities.push(createEntity(RESOURCE_TEMPLATE, 0, d, d, uid++));
  }

  result.Scenario.Entities[0].Entity = entities;
  const newXml = builder.buildObject(result);
  fs.writeFileSync(OUTPUT_FILE, newXml, 'utf8');

  console.log(`✅ Debug entities added: ${entities.length - initialCount}`);
  console.log(`Saved: ${OUTPUT_FILE}`);
})();

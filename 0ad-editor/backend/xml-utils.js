import fs from 'fs';
import xml2js from 'xml2js';

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

export function loadXmlMap(xmlFilePath) {
  const xmlData = fs.readFileSync(xmlFilePath, 'utf8');
  return parser.parseStringPromise(xmlData);
}

export function saveXmlMap(data, outputFilePath) {
  const newXml = builder.buildObject(data);
  fs.writeFileSync(outputFilePath, newXml, 'utf8');
}

export function initializeEntities(scenario) {
  // Assicurati che scenario.Entities esista
  if (!scenario.Entities) {
    scenario.Entities = [{}];
  }
  
  // Assicurati che scenario.Entities sia un array
  if (!Array.isArray(scenario.Entities)) {
    scenario.Entities = [scenario.Entities];
  }
  
  // Assicurati che scenario.Entities[0] esista e sia un oggetto
  if (!scenario.Entities[0] || typeof scenario.Entities[0] === 'string') {
    scenario.Entities[0] = {};
  }
  
  // Restituisci le entità esistenti o un array vuoto
  return scenario.Entities[0].Entity || [];
}

export function createEntity(template, rotation, x, z, uid) {
  const entity = {
    $: { uid: uid.toString() },
    Template: [template],
    Position: [{ $: { x: x.toFixed(4), z: z.toFixed(4) } }],
    Orientation: [{ $: { y: rotation.toFixed(5) } }],
    Actor: [{ $: { seed: Math.floor(Math.random() * 60000).toString() } }]
  };
  
  // NON aggiungere Player per le risorse Gaia
  // Le risorse naturali non appartengono a nessun player
  
  return entity;
}
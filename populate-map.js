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
import { pickTemplate } from './resource-config.js';
import { showWelcome, selectMapFile, configureParameters, confirmExecution } from './cli-utils.js';
import { loadConfig, updateConfig } from './config-manager.js';

const MAPS_DIR = './maps';


(async () => {
  try {
    showWelcome();
    
    // Carica configurazione salvata
    const config = loadConfig();
    
    // Modalità interattiva o con argomenti
    let mapName, customMapDim;
    
    if (process.argv.length >= 3) {
      // Modalità classica con argomenti
      mapName = process.argv[2];
      customMapDim = process.argv[3] ? parseInt(process.argv[3]) : null;
      console.log(`📥 Modalità argomenti: mappa=${mapName}`);
    } else {
      // Modalità interattiva
      mapName = await selectMapFile(MAPS_DIR, config.lastUsedMap);
      
      // Configura parametri interattivamente
      const newConfig = await configureParameters(config);
      
      // Conferma esecuzione
      if (!(await confirmExecution(mapName, newConfig))) {
        console.log('❌ Operazione annullata');
        process.exit(0);
      }
      
      // Salva nuova configurazione
      updateConfig({ ...newConfig, lastUsedMap: mapName });
      Object.assign(config, newConfig);
    }

    const XML_FILE = path.join(MAPS_DIR, `${mapName}.xml`);
    const PMP_FILE = path.join(MAPS_DIR, `${mapName}.pmp`);
    const OUTPUT_FILE = path.join(MAPS_DIR, `${mapName}${config.outputSuffix}.xml`);

    console.log(`\n📥 Caricamento mappa: ${mapName}`);
    const { altitudes, size } = readPmp(PMP_FILE);
    const mapDim = customMapDim || getMapDimensions(PMP_FILE);
    const result = await loadXmlMap(XML_FILE);

    const entities = initializeEntities(result.Scenario);
    let uidCounter = entities.length + 100;

    console.log(`✅ Mappa caricata (${size}x${size}), dimensioni: ${mapDim}, entità iniziali: ${entities.length}`);

    const { minAlt, maxAlt } = getAltitudeStats(altitudes);
    console.log(`🏔 Altitudini: min=${minAlt.toFixed(2)}, max=${maxAlt.toFixed(2)}, soglia acqua=${config.altWaterThreshold}`);
    
    const civilCenters = findCivilCenters(entities);
    console.log(`🏛 Civil Centers trovati: ${civilCenters.length}`);

    console.log(`\n🔧 Generazione risorse con configurazione:`);
    console.log(`   Cluster: ${config.clusterCount}, Raggio: ${config.clusterRadius}, Risorse/cluster: ${config.resourcesPerCluster}`);
    
    const positions = generatePositions(mapDim, config.clusterCount, config.clusterRadius, config.resourcesPerCluster);
    let added = 0;
    let rejectedCC = 0, rejectedBounds = 0, rejectedWater = 0;

    positions.forEach(pos => {
      if (pos.x < 0 || pos.x >= mapDim || pos.z < 0 || pos.z >= mapDim) {
        rejectedBounds++;
        return;
      }

      if (civilCenters.some(cc => distance(cc, pos) < config.exclusionRadius)) {
        rejectedCC++;
        return;
      }

      const alt = getAltitudeAt(pos.x, pos.z, altitudes, mapDim);
      
      if (alt <= config.altWaterThreshold) {
        rejectedWater++;
        return;
      }

      const template = pickTemplate(alt);
      entities.push(createEntity(template, 0, pos.x, pos.z, uidCounter++));
      added++;
    });

    console.log(`\n📊 Statistiche: CC esclusi=${rejectedCC}, Fuori confini=${rejectedBounds}, In acqua=${rejectedWater}, Aggiunti=${added}`);

    result.Scenario.Entities[0].Entity = entities;
    saveXmlMap(result, OUTPUT_FILE);

    console.log(`\n✅ Popolamento completato! Aggiunte ${added} nuove entità.`);
    console.log(`📄 File salvato: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error(`❌ Errore: ${error.message}`);
    process.exit(1);
  }
})();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { readPmp } from './pmp-utils.js';
import { loadXmlMap, saveXmlMap, initializeEntities, createEntity } from './xml-utils.js';
import { RESOURCE_TYPES, generateResourceCluster } from './resource-config.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'maps/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// API Routes

/**
 * GET /api/maps - Lista tutte le mappe disponibili
 */
app.get('/api/maps', (req, res) => {
  try {
    const mapsDir = './maps';
    const files = fs.readdirSync(mapsDir);
    
    // Trova coppie .pmp/.xml
    const maps = {};
    files.forEach(file => {
      const ext = path.extname(file);
      const name = path.basename(file, ext);
      
      if (ext === '.pmp' || ext === '.xml') {
        if (!maps[name]) maps[name] = {};
        maps[name][ext.slice(1)] = true;
      }
    });
    
    // Filtra solo mappe complete (con entrambi i file)
    const completeMaps = Object.keys(maps)
      .filter(name => maps[name].pmp && maps[name].xml)
      .map(name => ({ name, ...maps[name] }));
    
    res.json({ maps: completeMaps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/maps/:name - Carica una mappa specifica
 */
app.get('/api/maps/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const pmpPath = `./maps/${name}.pmp`;
    const xmlPath = `./maps/${name}.xml`;
    
    // Verifica esistenza file
    if (!fs.existsSync(pmpPath) || !fs.existsSync(xmlPath)) {
      return res.status(404).json({ error: 'Map files not found' });
    }
    
    // Leggi dati PMP (heightmap + texture)
    console.log(`📥 Loading map: ${name}`);
    const pmpData = readPmp(pmpPath);
    
    // Leggi dati XML (entità e metadati)
    const xmlData = await loadXmlMap(xmlPath);
    
    res.json({
      name,
      heightmap: {
        size: pmpData.size,
        mapDim: pmpData.mapDim,
        altitudes: pmpData.altitudes
      },
      textures: pmpData.textures,
      scenario: xmlData
    });
    
  } catch (error) {
    console.error('Error loading map:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/maps/:name/save - Salva modifiche alla mappa
 */
app.post('/api/maps/:name/save', async (req, res) => {
  try {
    const { name } = req.params;
    const { scenario } = req.body;
    
    const outputPath = `./maps/${name}_edited.xml`;
    
    saveXmlMap(scenario, outputPath);
    
    res.json({ 
      message: 'Map saved successfully',
      filename: `${name}_edited.xml`
    });
    
  } catch (error) {
    console.error('Error saving map:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/maps/:name/save-with-resources - Salva mappa con cluster di risorse
 */
app.post('/api/maps/:name/save-with-resources', async (req, res) => {
  try {
    const { name } = req.params;
    const { scenario, resourceClusters } = req.body;
    
    console.log(`💾 Saving map with ${resourceClusters.length} resource clusters`);
    
    const xmlPath = `./maps/${name}.xml`;
    
    // Verifica esistenza file originale
    if (!fs.existsSync(xmlPath)) {
      return res.status(404).json({ error: 'Original map XML file not found' });
    }
    
    // Carica il file XML originale
    const originalXmlData = await loadXmlMap(xmlPath);
    
    console.log('Loaded scenario with keys:', Object.keys(originalXmlData));
    
    // Il file originale ha solo <Scenario>, dobbiamo creare la struttura con <root>
    // e aggiungere una sezione <Entities> separata per le risorse Gaia
    
    // Inizializza le entità dello Scenario esistenti (include tutto: unità giocatori + risorse Gaia)
    const allEntities = initializeEntities(originalXmlData.Scenario);
    
    console.log(`Found ${allEntities.length} existing entities in scenario`);
    
    // Calcola UID disponibili da tutte le entità esistenti
    const existingUIDs = allEntities.map(e => parseInt(e.$ ? e.$.uid : e.uid || 0)).filter(uid => !isNaN(uid));
    let nextUID = 1000;
    
    if (existingUIDs.length > 0) {
      const maxUID = Math.max(...existingUIDs);
      nextUID = Math.max(1000, maxUID + 1);
    }
    
    // Aggiungi tutti i cluster di risorse alle entità Gaia
    let totalEntitiesAdded = 0;
    
    for (const cluster of resourceClusters) {
      console.log(`🌲 Processing ${cluster.resourceType} cluster at (${cluster.centerX}, ${cluster.centerZ})`);
      
      // Verifica tipo risorsa valido
      if (!RESOURCE_TYPES[cluster.resourceType]) {
        console.warn(`Invalid resource type: ${cluster.resourceType}`);
        continue;
      }
      
      // Genera posizioni cluster
      const resourcePositions = generateResourceCluster(
        cluster.resourceType,
        cluster.centerX,
        cluster.centerZ,
        cluster.density,
        cluster.radius,
        cluster.count
      );
      
      // Aggiungi entità alle entità esistenti dello Scenario
      resourcePositions.forEach(pos => {
        const entity = createEntity(pos.template, pos.rotation, pos.x, pos.z, nextUID++);
        allEntities.push(entity);  // Aggiungi alla lista unica di entità
        totalEntitiesAdded++;
      });
    }
    
    // Aggiorna lo scenario con tutte le entità (originali + nuove risorse)
    originalXmlData.Scenario.Entities[0].Entity = allEntities;
    
    console.log(`Final scenario will have ${allEntities.length} total entities`);
    
    // Salva file finale (mantieni la struttura originale)
    const outputPath = `./maps/${name}_edited.xml`;
    saveXmlMap(originalXmlData, outputPath);
    
    console.log(`✅ Saved map with ${totalEntitiesAdded} new resource entities`);
    
    res.json({
      success: true,
      message: `Map saved with ${totalEntitiesAdded} new resource entities`,
      clustersProcessed: resourceClusters.length,
      entitiesAdded: totalEntitiesAdded,
      savedTo: outputPath
    });
    
  } catch (error) {
    console.error('Error saving map with resources:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/upload - Upload nuovi file mappa
 */
app.post('/api/upload', upload.fields([
  { name: 'pmp', maxCount: 1 },
  { name: 'xml', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files;
    
    if (!files.pmp || !files.xml) {
      return res.status(400).json({ error: 'Both .pmp and .xml files required' });
    }
    
    const mapName = path.basename(files.pmp[0].filename, '.pmp');
    
    res.json({
      message: 'Files uploaded successfully',
      mapName,
      files: {
        pmp: files.pmp[0].filename,
        xml: files.xml[0].filename
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/maps/:name/place-resources - Piazza un cluster di risorse sulla mappa
 */
app.post('/api/maps/:name/place-resources', async (req, res) => {
  try {
    const { name } = req.params;
    const { resourceType, centerX, centerZ, density, radius, count } = req.body;
    
    console.log(`🌲 Placing ${resourceType} cluster at (${centerX}, ${centerZ})`);
    
    // Verifica che il tipo di risorsa sia valido
    if (!RESOURCE_TYPES[resourceType]) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    const xmlPath = `./maps/${name}.xml`;
    
    // Verifica esistenza file
    if (!fs.existsSync(xmlPath)) {
      return res.status(404).json({ error: 'Map XML file not found' });
    }
    
    // Carica dati XML
    const xmlData = await loadXmlMap(xmlPath);
    const entities = initializeEntities(xmlData.Scenario);
    
    // Genera cluster di risorse
    const resourcePositions = generateResourceCluster(
      resourceType, 
      centerX, 
      centerZ, 
      density, 
      radius, 
      count
    );
    
    // Calcola il prossimo UID disponibile partendo da 1000 per evitare conflitti
    const existingUIDs = entities.map(e => parseInt(e.$ ? e.$.uid : e.uid || 0)).filter(uid => !isNaN(uid));
    let nextUID = 1000; // Partiamo da 1000 per sicurezza
    
    if (existingUIDs.length > 0) {
      const maxUID = Math.max(...existingUIDs);
      nextUID = Math.max(1000, maxUID + 1); // Almeno 1000, o il massimo esistente + 1
    }
    
    // Aggiungi entità alle entità esistenti
    let addedCount = 0;
    resourcePositions.forEach(pos => {
      const entity = createEntity(pos.template, pos.rotation, pos.x, pos.z, nextUID++);
      entities.push(entity);
      addedCount++;
    });
    
    // Aggiorna i dati XML
    xmlData.Scenario.Entities[0].Entity = entities;
    
    // Salva automaticamente la mappa con suffisso
    const outputPath = `./maps/${name}_edited.xml`;
    saveXmlMap(xmlData, outputPath);
    
    console.log(`✅ Added ${addedCount} ${RESOURCE_TYPES[resourceType].name} entities`);
    
    res.json({
      success: true,
      message: `Successfully placed ${addedCount} ${RESOURCE_TYPES[resourceType].name} entities`,
      cluster: {
        resourceType,
        centerX,
        centerZ,
        entitiesAdded: addedCount,
        nextUID: nextUID
      },
      savedTo: outputPath
    });
    
  } catch (error) {
    console.error('Error placing resources:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/textures/:name - Restituisce info texture per una mappa
 */
app.get('/api/textures/:name', (req, res) => {
  try {
    const { name } = req.params;
    const pmpPath = `./maps/${name}.pmp`;
    
    if (!fs.existsSync(pmpPath)) {
      return res.status(404).json({ error: 'PMP file not found' });
    }
    
    const pmpData = readPmp(pmpPath);
    
    res.json({
      textureNames: pmpData.textures.textureNames,
      textureCount: pmpData.textures.textureNames.length,
      tileDataSize: {
        width: pmpData.textures.tileData[0]?.length || 0,
        height: pmpData.textures.tileData.length
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Avvia server
app.listen(PORT, () => {
  console.log(`🚀 0 A.D. Map Editor Backend running on http://localhost:${PORT}`);
  console.log(`📁 Serving maps from: ${path.resolve('./maps')}`);
});
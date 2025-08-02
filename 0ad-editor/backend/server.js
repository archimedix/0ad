import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { readPmp } from './pmp-utils.js';
import { loadXmlMap, saveXmlMap } from './xml-utils.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
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
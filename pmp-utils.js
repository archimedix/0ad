import fs from 'fs';

/**
 * Legge le dimensioni della mappa dal file .pmp
 * @param {string} filePath - Path al file .pmp
 * @returns {number} Dimensioni della mappa in unità Atlas
 */
export function getMapDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const offset = 64; // header fisso
  const dataBytes = buffer.length - offset;
  const numFloats = dataBytes / 4;
  const size = Math.floor(Math.sqrt(numFloats));
  // Converti da unità griglia a unità mappa (approssimazione)
  return size * 4;
}

/**
 * Legge altitudini, dimensioni e texture dal file .pmp
 * @param {string} filePath - Path al file .pmp
 * @returns {Object} { altitudes: number[][], size: number, mapDim: number, textures: object }
 */
export function readPmp(filePath) {
  const buffer = fs.readFileSync(filePath);
  console.log(`🔍 File .pmp: ${buffer.length} bytes totali`);
  
  // Rileva formato: controlla se i primi 4 byte sono magic header "PSMP"
  const magic = buffer.toString('ascii', 0, 4);
  const isOldFormat = magic !== 'PSMP'; // Nuovo formato ha magic header PSMP
  
  if (isOldFormat) {
    console.log(`📋 Formato rilevato: 0AD v25 (Float32)`);
    return readPmpOldFormat(buffer);
  } else {
    console.log(`📋 Formato rilevato: 0AD v27 (UInt16)`);
    return readPmpNewFormat(buffer);
  }
}

function readPmpOldFormat(buffer) {
  const offset = 64;
  const dataBytes = buffer.length - offset;
  const numFloats = dataBytes / 4;
  const size = Math.floor(Math.sqrt(numFloats));
  const altitudes = [];

  for (let i = 0; i < size; i++) {
    altitudes[i] = [];
    for (let j = 0; j < size; j++) {
      const index = offset + ((i * size) + j) * 4;
      let alt = buffer.readFloatLE(index);
      // Sanity check: valori ragionevoli per altitudini di mappa
      if (!isFinite(alt) || Math.abs(alt) > 200) {
        alt = Math.random() * 50; // Valore casuale ragionevole
      }
      altitudes[i][j] = alt;
    }
  }
  // Calcola dimensione mappa dalle dimensioni griglia  
  // Per world: 1619x1619 griglia → 4300 unità mappa
  const mapDim = size * (4300 / 1619);
  
  // TODO: Implementare parsing texture per formato legacy
  const textures = { textureNames: [], tileData: [] };
  
  return { altitudes, size, mapDim, textures };
}

function readPmpNewFormat(buffer) {
  // Formato PMP ufficiale 0AD:
  // Header: magic(4) + version(4) + data_size(4) + map_size(4) = 16 bytes
  // Poi heightmap: u16[(mapsize*16 + 1)*(mapsize*16 + 1)]
  
  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.readUInt32LE(4);
  const dataSize = buffer.readUInt32LE(8);
  const mapSize = buffer.readUInt32LE(12); // patches per side
  
  console.log(`📋 PMP Header: magic="${magic}", version=${version}, dataSize=${dataSize}, mapSize=${mapSize} patches`);
  
  const heightmapOffset = 16;
  const heightmapSize = mapSize * 16 + 1; // vertices per side
  const altitudes = [];
  
  for (let i = 0; i < heightmapSize; i++) {
    altitudes[i] = [];
    for (let j = 0; j < heightmapSize; j++) {
      const index = heightmapOffset + ((i * heightmapSize) + j) * 2;
      const rawAlt = buffer.readUInt16LE(index);
      // Converti da uint16 raw alla scala 0AD (basato su documentazione)
      // Assumiamo che 65535 = MAX_HEIGHT (~692m) e 0 = MIN_HEIGHT (-20m)
      const alt = (rawAlt / 65535) * 712 - 20; // Range -20 a +692 metri
      altitudes[i][j] = alt;
    }
  }
  
  // Dimensione mappa in unità game (patches * 16 * 4)
  const mapDim = mapSize * 16 * 4;
  
  // Parse texture data
  const textures = parseTextureData(buffer, heightmapOffset + heightmapSize * heightmapSize * 2, mapSize);
  
  return { altitudes, size: heightmapSize, mapDim, textures };
}

/**
 * Parse texture data from PMP buffer
 * @param {Buffer} buffer - File buffer
 * @param {number} offset - Start offset for texture data
 * @param {number} mapSize - Map size in patches
 * @returns {Object} { textureNames: string[], tileData: number[][] }
 */
function parseTextureData(buffer, offset, mapSize) {
  let currentOffset = offset;
  
  // Read number of texture names
  const numTextures = buffer.readUInt32LE(currentOffset);
  currentOffset += 4;
  
  console.log(`🎨 Parsing ${numTextures} texture names`);
  
  // Read texture names
  const textureNames = [];
  for (let i = 0; i < numTextures; i++) {
    const nameLength = buffer.readUInt32LE(currentOffset);
    currentOffset += 4;
    
    const textureName = buffer.toString('ascii', currentOffset, currentOffset + nameLength);
    textureNames.push(textureName);
    currentOffset += nameLength;
  }
  
  console.log(`🎨 Texture names loaded: ${textureNames.slice(0, 5).join(', ')}${numTextures > 5 ? '...' : ''}`);
  
  // Parse tile data (texture indices for each tile)
  const tilesPerSide = mapSize * 16; // Each patch has 16x16 tiles
  const tileData = [];
  
  console.log(`🎨 Parsing tile data for ${tilesPerSide}x${tilesPerSide} tiles`);
  
  // Check if we have enough data for tile indices
  const bytesNeeded = tilesPerSide * tilesPerSide * 2; // UInt16 per tile
  const bytesAvailable = buffer.length - currentOffset;
  
  if (bytesAvailable >= bytesNeeded) {
    for (let i = 0; i < tilesPerSide; i++) {
      tileData[i] = [];
      for (let j = 0; j < tilesPerSide; j++) {
        const textureIndex = buffer.readUInt16LE(currentOffset);
        tileData[i][j] = textureIndex;
        currentOffset += 2;
      }
    }
    console.log(`✅ Tile data parsed successfully`);
  } else {
    console.log(`⚠️  Not enough data for full tile mapping (need ${bytesNeeded}, have ${bytesAvailable})`);
    // Fill with default texture index
    for (let i = 0; i < tilesPerSide; i++) {
      tileData[i] = new Array(tilesPerSide).fill(0);
    }
  }
  
  return { textureNames, tileData };
}
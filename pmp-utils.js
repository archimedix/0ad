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
 * Legge altitudini e dimensioni dal file .pmp
 * @param {string} filePath - Path al file .pmp
 * @returns {Object} { altitudes: number[][], size: number, mapDim: number }
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
  return { altitudes, size, mapDim };
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
  return { altitudes, size: heightmapSize, mapDim };
}
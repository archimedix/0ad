import { readPmp } from './pmp-utils.js';

console.log('=== Test Parsing Texture ===\n');

const data = readPmp('./maps/world.pmp');

console.log(`✅ Mappa caricata: ${data.mapDim} unità`);
console.log(`📋 Heightmap: ${data.size}x${data.size}`);
console.log(`🎨 Texture: ${data.textures.textureNames.length} disponibili`);
console.log(`🗺️  Tile data: ${data.textures.tileData.length}x${data.textures.tileData[0].length}`);

// Analizza distribuzione texture indices
const indexCount = {};
let validIndices = 0;
let totalTiles = 0;

for (let i = 0; i < data.textures.tileData.length; i++) {
  for (let j = 0; j < data.textures.tileData[i].length; j++) {
    const index = data.textures.tileData[i][j];
    totalTiles++;
    
    if (index < data.textures.textureNames.length) {
      validIndices++;
      indexCount[index] = (indexCount[index] || 0) + 1;
    } else {
      // Conta indici speciali (come 65535)
      indexCount[index] = (indexCount[index] || 0) + 1;
    }
  }
}

console.log(`\n📊 Analisi distribuzione texture:`);
console.log(`- Tile totali: ${totalTiles}`);
console.log(`- Indici validi: ${validIndices}`);
console.log(`- Indici speciali: ${totalTiles - validIndices}`);

// Mostra top 10 texture più usate
const sortedIndices = Object.entries(indexCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log(`\n🏆 Top 10 texture più usate:`);
sortedIndices.forEach(([index, count], pos) => {
  const textureName = index < data.textures.textureNames.length 
    ? data.textures.textureNames[index] 
    : `SPECIAL_${index}`;
  console.log(`${pos + 1}. ${textureName}: ${count} tile`);
});

console.log(`\n📋 Prime 20 texture disponibili:`);
data.textures.textureNames.slice(0, 20).forEach((name, i) => {
  console.log(`${i}: ${name}`);
});
export function gameToGridCoords(gameX, gameZ, mapDim, gridSize) {
  const i = Math.floor((gameZ / mapDim) * gridSize);
  const j = Math.floor((gameX / mapDim) * gridSize);
  
  return {
    i: Math.max(0, Math.min(gridSize - 1, i)),
    j: Math.max(0, Math.min(gridSize - 1, j))
  };
}

export function getAltitudeAt(gameX, gameZ, altitudes, mapDim) {
  const { i, j } = gameToGridCoords(gameX, gameZ, mapDim, altitudes.length);
  return altitudes[i][j];
}

export function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

export function generatePositions(mapDim, count, clusterRadius, resourcesPerCluster) {
  const positions = [];
  const margin = clusterRadius;
  
  for (let i = 0; i < count; i++) {
    const x = margin + Math.random() * (mapDim - 2 * margin);
    const z = margin + Math.random() * (mapDim - 2 * margin);
    positions.push({ x, z });
    
    for (let c = 0; c < resourcesPerCluster; c++) {
      let newX, newZ, attempts = 0;
      do {
        newX = x + (Math.random() - 0.5) * clusterRadius;
        newZ = z + (Math.random() - 0.5) * clusterRadius;
        attempts++;
      } while ((newX < 0 || newX >= mapDim || newZ < 0 || newZ >= mapDim) && attempts < 10);
      
      if (newX >= 0 && newX < mapDim && newZ >= 0 && newZ < mapDim) {
        positions.push({ x: newX, z: newZ });
      }
    }
  }
  return positions;
}

export function findCivilCenters(entities) {
  return entities
    .filter(e => e.Template[0].includes('civil_centre'))
    .map(e => {
      const pos = e.Position[0].$;
      return { x: parseFloat(pos.x), z: parseFloat(pos.z) };
    });
}

export function getAltitudeStats(altitudes) {
  let minAlt = Infinity, maxAlt = -Infinity;
  altitudes.forEach(row => row.forEach(alt => {
    minAlt = Math.min(minAlt, alt);
    maxAlt = Math.max(maxAlt, alt);
  }));
  return { minAlt, maxAlt };
}

export function sampleAltitudes(altitudes, sampleCount = 5) {
  const samples = [];
  const size = altitudes.length;
  
  for (let test = 0; test < sampleCount; test++) {
    const i = Math.floor(Math.random() * size);
    const j = Math.floor(Math.random() * size);
    samples.push({ i, j, altitude: altitudes[i][j] });
  }
  return samples;
}
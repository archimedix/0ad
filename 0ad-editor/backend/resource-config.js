export const CLUSTER_COUNT = 200;
export const CLUSTER_RADIUS = 50;
export const RESOURCES_PER_CLUSTER = 10;
export const ALT_WATER_THRESHOLD = 5;
export const EXCLUSION_RADIUS = 300;

// Configurazione tipi di risorse per l'interfaccia grafica
export const RESOURCE_TYPES = {
  ALPINE_FOREST: {
    id: 'alpine_forest',
    name: 'Foresta Alpina',
    color: '#2d5a27',
    defaultDensity: 0.8,
    defaultRadius: 30,
    defaultCount: 8,
    templates: [
      'flora/trees/alpine/pine',
      'flora/trees/alpine/pine_w', 
      'flora/trees/alpine/fir_tree',
      // 'gaia/tree/alpine/spruce'
    ]
  },
  MEDITERRANEAN_FOREST: {
    id: 'mediterranean_forest', 
    name: 'Foresta Mediterranea',
    color: '#4a7c59',
    defaultDensity: 0.7,
    defaultRadius: 35,
    defaultCount: 10,
    templates: [
      'gaia/tree/oak',
      'gaia/tree/oak_aut',
      'gaia/tree/olive',
      'gaia/tree/carob',
      'gaia/tree/fig'
    ]
  },
  TROPICAL_FOREST: {
    id: 'tropical_forest',
    name: 'Foresta Tropicale', 
    color: '#228b22',
    defaultDensity: 0.9,
    defaultRadius: 40,
    defaultCount: 12,
    templates: [
      'gaia/tree/medit_fan_palm',
      'gaia/tree/mangrove',
      'gaia/tree/baobab',
      'gaia/tree/palm_senegal_date',
      'gaia/tree/bamboo'
    ]
  },
  STONES: {
    id: 'stones',
    name: 'Pietre',
    color: '#696969',
    defaultDensity: 0.6,
    defaultRadius: 20,
    defaultCount: 6,
    templates: [
      'gaia/rock/temperate_large_03',
      'gaia/rock/mediterranean_large',
      'gaia/rock/desert_large',
      'gaia/rock/alpine_large'
    ]
  },
  METALS: {
    id: 'metals',
    name: 'Metalli',
    color: '#daa520',
    defaultDensity: 0.5,
    defaultRadius: 15,
    defaultCount: 4,
    templates: [
      'gaia/ore/temperate_large',
      'gaia/ore/temperate_small',
      'gaia/ore/desert_large',
      'gaia/ore/alpine_large'
    ]
  }
};

// Manteniamo le configurazioni originali per compatibilità
export const TROPICAL_TREES = RESOURCE_TYPES.TROPICAL_FOREST.templates;
export const TROPICAL_FAUNA = ['gaia/fauna_goat', 'gaia/fauna_chicken'];

export const TEMPERATE_TREES = RESOURCE_TYPES.MEDITERRANEAN_FOREST.templates;
export const TEMPERATE_FAUNA = ['gaia/fauna_deer', 'gaia/fauna_rabbit'];

export const ROCKS = RESOURCE_TYPES.STONES.templates;
export const METALS = RESOURCE_TYPES.METALS.templates;

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickTemplate(alt) {
  if (alt < 10) {
    return Math.random() < 0.7 ? pickRandom(TROPICAL_TREES) : pickRandom(TROPICAL_FAUNA);
  } else if (alt < 40) {
    return Math.random() < 0.6 ? pickRandom(TEMPERATE_TREES) : pickRandom(TEMPERATE_FAUNA);
  } else {
    return Math.random() < 0.7 ? pickRandom(ROCKS) : pickRandom(METALS);
  }
}

export function generateResourceCluster(resourceType, centerX, centerZ, density = null, radius = null, count = null) {
  const resourceConfig = RESOURCE_TYPES[resourceType];
  if (!resourceConfig) {
    throw new Error(`Tipo di risorsa sconosciuto: ${resourceType}`);
  }
  
  const clusterDensity = density ?? resourceConfig.defaultDensity;
  const clusterRadius = radius ?? resourceConfig.defaultRadius;
  const clusterCount = count ?? resourceConfig.defaultCount;
  
  const positions = [];
  
  for (let i = 0; i < clusterCount; i++) {
    // Genera posizione casuale nel cerchio
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.sqrt(Math.random()) * clusterRadius * clusterDensity;
    
    const x = centerX + Math.cos(angle) * distance;
    const z = centerZ + Math.sin(angle) * distance;
    
    // Seleziona template casuale dal tipo di risorsa
    const template = pickRandom(resourceConfig.templates);
    
    positions.push({
      x: Math.round(x),
      z: Math.round(z),
      template: template,
      rotation: Math.random() * 2 * Math.PI
    });
  }
  
  return positions;
}
export const CLUSTER_COUNT = 200;
export const CLUSTER_RADIUS = 50;
export const RESOURCES_PER_CLUSTER = 10;
export const ALT_WATER_THRESHOLD = 5;
export const EXCLUSION_RADIUS = 300;

export const TROPICAL_TREES = ['gaia/tree/medit_fan_palm', 'gaia/tree/mangrove'];
export const TROPICAL_FAUNA = ['gaia/fauna_goat', 'gaia/fauna_chicken'];

export const TEMPERATE_TREES = ['gaia/tree/oak', 'gaia/tree/oak_aut', 'gaia/tree/maple_autumn', 'gaia/tree/juniper_prickly'];
export const TEMPERATE_FAUNA = ['gaia/fauna_deer', 'gaia/fauna_rabbit'];

export const ROCKS = ['gaia/rock/temperate_large_03', 'gaia/rock/mediterranean_large'];
export const METALS = ['gaia/ore/temperate_large', 'gaia/ore/temperate_small'];

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
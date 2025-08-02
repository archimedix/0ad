import fs from 'fs';
import path from 'path';

const CONFIG_FILE = '.0ad-config.json';

const DEFAULT_CONFIG = {
  clusterCount: 200,
  clusterRadius: 50,
  resourcesPerCluster: 10,
  altWaterThreshold: 5,
  exclusionRadius: 300,
  outputSuffix: '_populated',
  lastUsedMap: null
};

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(configData);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.warn('⚠️  Errore nel caricamento configurazione, uso i default');
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.warn('⚠️  Errore nel salvataggio configurazione');
  }
}

export function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  saveConfig(newConfig);
  return newConfig;
}
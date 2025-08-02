import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';

export async function selectMapFile(mapsDir = './maps', lastUsedMap = null) {
  try {
    const files = fs.readdirSync(mapsDir)
      .filter(file => file.endsWith('.xml'))
      .map(file => path.basename(file, '.xml'));
    
    if (files.length === 0) {
      throw new Error('Nessun file .xml trovato nella cartella maps');
    }

    // Metti la mappa usata in precedenza come default se esiste
    let defaultChoice = lastUsedMap && files.includes(lastUsedMap) ? lastUsedMap : files[0];

    const { selectedMap } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedMap',
        message: '📁 Seleziona la mappa da popolare:',
        choices: files,
        default: defaultChoice,
        pageSize: 10
      }
    ]);

    return selectedMap;
  } catch (error) {
    console.error(`❌ Errore nella selezione file: ${error.message}`);
    process.exit(1);
  }
}

export async function configureParameters(currentConfig) {
  console.log('\n🔧 Configurazione parametri (premi Invio per usare il default):');
  
  const questions = [
    {
      type: 'input',
      name: 'clusterCount',
      message: `Numero di cluster di risorse:`,
      default: currentConfig.clusterCount,
      validate: (input) => {
        const num = parseInt(input);
        return (num > 0 && num <= 1000) ? true : 'Deve essere un numero tra 1 e 1000';
      },
      filter: (input) => parseInt(input) || currentConfig.clusterCount
    },
    {
      type: 'input',
      name: 'clusterRadius',
      message: `Raggio del cluster:`,
      default: currentConfig.clusterRadius,
      validate: (input) => {
        const num = parseInt(input);
        return (num > 0 && num <= 200) ? true : 'Deve essere un numero tra 1 e 200';
      },
      filter: (input) => parseInt(input) || currentConfig.clusterRadius
    },
    {
      type: 'input',
      name: 'resourcesPerCluster',
      message: `Risorse per cluster:`,
      default: currentConfig.resourcesPerCluster,
      validate: (input) => {
        const num = parseInt(input);
        return (num >= 0 && num <= 50) ? true : 'Deve essere un numero tra 0 e 50';
      },
      filter: (input) => parseInt(input) || currentConfig.resourcesPerCluster
    },
    {
      type: 'input',
      name: 'altWaterThreshold',
      message: `Soglia altitudine acqua:`,
      default: currentConfig.altWaterThreshold,
      validate: (input) => {
        const num = parseFloat(input);
        return (num >= 0 && num <= 50) ? true : 'Deve essere un numero tra 0 e 50';
      },
      filter: (input) => parseFloat(input) || currentConfig.altWaterThreshold
    },
    {
      type: 'input',
      name: 'exclusionRadius',
      message: `Raggio esclusione Civil Centers:`,
      default: currentConfig.exclusionRadius,
      validate: (input) => {
        const num = parseInt(input);
        return (num >= 0 && num <= 1000) ? true : 'Deve essere un numero tra 0 e 1000';
      },
      filter: (input) => parseInt(input) || currentConfig.exclusionRadius
    },
    {
      type: 'input',
      name: 'outputSuffix',
      message: `Suffisso file di output:`,
      default: currentConfig.outputSuffix,
      validate: (input) => {
        const trimmed = input.trim();
        return trimmed.length > 0 ? true : 'Il suffisso non può essere vuoto';
      },
      filter: (input) => input.trim() || currentConfig.outputSuffix
    }
  ];

  return await inquirer.prompt(questions);
}

export async function confirmExecution(mapName, config) {
  console.log('\n📋 Riepilogo configurazione:');
  console.log(`   Mappa: ${mapName}`);
  console.log(`   Cluster: ${config.clusterCount}`);
  console.log(`   Raggio cluster: ${config.clusterRadius}`);
  console.log(`   Risorse per cluster: ${config.resourcesPerCluster}`);
  console.log(`   Soglia acqua: ${config.altWaterThreshold}`);
  console.log(`   Esclusione CC: ${config.exclusionRadius}`);
  console.log(`   Suffisso output: ${config.outputSuffix}`);

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: '🚀 Procedere con il popolamento della mappa?',
      default: true
    }
  ]);

  return proceed;
}

export function showWelcome() {
  console.log('🎮 ===== 0 A.D. Map Populator =====');
  console.log('   Strumento per aggiungere risorse alle mappe\n');
}
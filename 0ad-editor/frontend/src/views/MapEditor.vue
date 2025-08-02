<template>
  <div class="flex h-screen bg-gray-900">
    <!-- Sidebar -->
    <div class="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <!-- Map selector -->
      <div class="p-4 border-b border-gray-700">
        <h2 class="text-lg font-semibold text-white mb-3">Mappa</h2>
        <select
          v-model="selectedMapName"
          @change="loadMap"
          class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">Seleziona mappa...</option>
          <option v-for="map in availableMaps" :key="map.name" :value="map.name">
            {{ map.name }}
          </option>
        </select>
      </div>

      <!-- View mode -->
      <div class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Modalità Vista</h3>
        <div class="space-y-2">
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              v-model="viewMode"
              value="heightmap"
              class="form-radio text-blue-600"
            >
            <span class="text-gray-300">Heightmap</span>
          </label>
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              v-model="viewMode"
              value="texture"
              class="form-radio text-blue-600"
            >
            <span class="text-gray-300">Texture</span>
          </label>
          <label class="flex items-center space-x-2">
            <input
              type="radio"
              v-model="viewMode"
              value="entities"
              class="form-radio text-blue-600"
            >
            <span class="text-gray-300">Entità</span>
          </label>
        </div>
      </div>

      <!-- Map info -->
      <div v-if="mapData" class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Informazioni Mappa</h3>
        <div class="space-y-2 text-sm text-gray-300">
          <div>Nome: {{ selectedMapName }}</div>
          <div>Dimensioni: {{ mapData.heightmap?.mapDim || 0 }} unità</div>
          <div>Heightmap: {{ mapData.heightmap?.size || 0 }}x{{ mapData.heightmap?.size || 0 }}</div>
          <div>Texture: {{ mapData.textures?.textureNames?.length || 0 }}</div>
          <div v-if="mapData.scenario?.Environment">
            Ambiente: {{ getEnvironmentInfo() }}
          </div>
          <div class="text-xs text-gray-400">
            Elevazioni: {{ elevationRange.min.toFixed(1) }}m - {{ elevationRange.max.toFixed(1) }}m
          </div>
        </div>
      </div>

      <!-- Water level control -->
      <div v-if="mapData && viewMode === 'heightmap'" class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Livello Acqua</h3>
        <div class="space-y-3">
          <div class="text-sm text-gray-300">
            <div>Corrente: {{ currentWaterLevel.toFixed(1) }}</div>
            <div class="text-xs text-gray-400">
              XML: {{ xmlWaterLevel.toFixed(1) }}
            </div>
          </div>
          <div class="space-y-2">
            <input
              type="range"
              v-model.number="currentWaterLevel"
              :min="elevationRange.min - 5"
              :max="elevationRange.max"
              :step="0.1"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex items-center space-x-2">
              <label class="text-xs text-gray-400 whitespace-nowrap">Valore preciso:</label>
              <input
                type="number"
                v-model.number="roundedWaterLevel"
                :min="elevationRange.min - 5"
                :max="elevationRange.max"
                :step="0.1"
                class="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                placeholder="Inserisci valore"
              >
              <span class="text-xs text-gray-400">unità</span>
            </div>
          </div>
          <div class="flex space-x-2">
            <button
              @click="resetWaterLevel"
              class="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
            >
              Reset XML
            </button>
            <button
              @click="currentWaterLevel = elevationRange.min"
              class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
            >
              Min
            </button>
          </div>
        </div>
      </div>

      <!-- Color bands control -->
      <div v-if="mapData && viewMode === 'heightmap'" class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Fasce Colore Terreno</h3>
        <div class="space-y-3 text-sm">
          <div class="flex items-center space-x-2">
            <label class="text-gray-300 w-20">Spiaggia:</label>
            <span class="text-gray-400 text-xs">0% -</span>
            <input
              type="number"
              v-model.number="beachThreshold"
              min="1"
              max="50"
              step="1"
              class="w-16 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded focus:outline-none focus:border-blue-500"
            >
            <span class="text-gray-400 text-xs">%</span>
          </div>
          <div class="flex items-center space-x-2">
            <label class="text-gray-300 w-20">Colline:</label>
            <span class="text-gray-400 text-xs">{{ beachThreshold }}% -</span>
            <input
              type="number"
              v-model.number="hillsThreshold"
              :min="beachThreshold + 1"
              max="90"
              step="1"
              class="w-16 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded focus:outline-none focus:border-blue-500"
            >
            <span class="text-gray-400 text-xs">%</span>
          </div>
          <div class="flex items-center space-x-2">
            <label class="text-gray-300 w-20">Montagne:</label>
            <span class="text-gray-400 text-xs">{{ hillsThreshold }}% - 100%</span>
          </div>
        </div>
      </div>

      <!-- Interaction mode -->
      <div v-if="mapData && viewMode === 'heightmap'" class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Modalità Interazione</h3>
        
        <!-- Mode toggle -->
        <div class="space-y-3 mb-4">
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="setInteractionMode('navigate')"
              class="px-3 py-2 rounded text-sm font-medium transition-colors"
              :class="interactionMode === 'navigate' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            >
              🖱️ Naviga
            </button>
            <button
              @click="setInteractionMode('place')"
              class="px-3 py-2 rounded text-sm font-medium transition-colors"
              :class="interactionMode === 'place' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
            >
              ➕ Piazza
            </button>
          </div>
          
          <div class="text-xs text-gray-400 p-2 bg-gray-800 rounded">
            <span v-if="interactionMode === 'navigate'">
              🖱️ Click e trascina per navigare la mappa
            </span>
            <span v-else>
              ➕ Seleziona una risorsa e clicca sulla mappa per piazzarla
            </span>
          </div>
        </div>
      </div>

      <!-- Resource placement controls -->
      <div v-if="mapData && viewMode === 'heightmap' && interactionMode === 'place'" class="p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-3">Selezione Risorse</h3>
        
        <!-- Resource type selection -->
        <div class="space-y-3">
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="(resourceType, key) in resourceTypes"
              :key="key"
              class="p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors border-2"
              :class="{ 'border-blue-500 bg-gray-600': selectedResourceType === key, 'border-transparent': selectedResourceType !== key }"
              @click="selectResourceType(key)"
            >
              <div class="flex items-center space-x-2">
                <div 
                  class="w-4 h-4 rounded border border-gray-500" 
                  :style="{ backgroundColor: resourceType.color }"
                ></div>
                <span class="text-sm text-gray-300">{{ resourceType.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cluster parameters -->
        <div v-if="selectedResourceType" class="mt-4 space-y-3">
          <h4 class="text-sm font-semibold text-gray-300">Parametri Cluster</h4>
          
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <label class="text-gray-400">Densità:</label>
              <div class="flex items-center space-x-2">
                <input
                  type="range"
                  v-model.number="clusterDensity"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  class="w-16 h-1 bg-gray-700 rounded appearance-none cursor-pointer"
                >
                <span class="text-gray-300 w-8 text-right">{{ clusterDensity }}</span>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <label class="text-gray-400">Raggio:</label>
              <div class="flex items-center space-x-2">
                <input
                  type="range"
                  v-model.number="clusterRadius"
                  min="10"
                  max="100"
                  step="5"
                  class="w-16 h-1 bg-gray-700 rounded appearance-none cursor-pointer"
                >
                <span class="text-gray-300 w-8 text-right">{{ clusterRadius }}</span>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <label class="text-gray-400">Numero:</label>
              <div class="flex items-center space-x-2">
                <input
                  type="range"
                  v-model.number="clusterCount"
                  min="2"
                  max="20"
                  step="1"
                  class="w-16 h-1 bg-gray-700 rounded appearance-none cursor-pointer"
                >
                <span class="text-gray-300 w-8 text-right">{{ clusterCount }}</span>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-500 p-2 bg-gray-800 rounded">
            Clicca sulla mappa per piazzare un cluster di {{ resourceTypes[selectedResourceType]?.name?.toLowerCase() }}
          </div>
          
          <!-- Pending clusters info -->
          <div v-if="pendingResourceClusters.length > 0" class="mt-3 p-2 bg-blue-900 bg-opacity-50 rounded border border-blue-600">
            <div class="text-xs text-blue-300 font-semibold mb-1">
              {{ pendingResourceClusters.length }} cluster in attesa di salvataggio
            </div>
            <div class="text-xs text-blue-400 space-y-1 max-h-20 overflow-y-auto">
              <div v-for="cluster in pendingResourceClusters.slice(-3)" :key="cluster.id" class="flex justify-between">
                <span>{{ resourceTypes[cluster.resourceType]?.name }}</span>
                <span>({{ cluster.centerX.toFixed(0) }}, {{ cluster.centerZ.toFixed(0) }})</span>
              </div>
              <div v-if="pendingResourceClusters.length > 3" class="text-blue-500">
                ... e altri {{ pendingResourceClusters.length - 3 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Texture palette -->
      <div v-if="mapData?.textures?.textureNames && viewMode === 'texture'" class="p-4">
        <h3 class="text-lg font-semibold text-white mb-3">Palette Texture</h3>
        <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          <div
            v-for="(texture, index) in mapData.textures.textureNames.slice(0, 50)"
            :key="index"
            class="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 cursor-pointer truncate"
            :title="texture"
            @click="selectTexture(index)"
            :class="{ 'bg-blue-600': selectedTexture === index }"
          >
            {{ texture.replace(/^[^_]*_/, '') }}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="p-4">
        <h3 class="text-lg font-semibold text-white mb-3">Azioni</h3>
        <div class="space-y-2">
          <button
            @click="saveMap"
            :disabled="!mapData"
            class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            :class="{ 'bg-green-700': pendingResourceClusters.length > 0 }"
          >
            {{ pendingResourceClusters.length > 0 ? `Salva Mappa (${pendingResourceClusters.length} cluster)` : 'Salva Mappa' }}
          </button>
          <button
            v-if="pendingResourceClusters.length > 0"
            @click="clearPendingClusters"
            class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Annulla Cluster ({{ pendingResourceClusters.length }})
          </button>
          <button
            @click="exportMap"
            :disabled="!mapData"
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            Esporta
          </button>
        </div>
      </div>
    </div>

    <!-- Main canvas area -->
    <div class="flex-1 p-4">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-400">Caricamento mappa...</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md">
          <h3 class="text-red-300 font-semibold mb-2">Errore</h3>
          <p class="text-red-200">{{ error }}</p>
        </div>
      </div>

      <!-- Map canvas -->
      <div v-else-if="mapData" class="flex items-center justify-center h-full overflow-hidden">
        <div class="canvas-viewport max-w-full max-h-full overflow-hidden">
          <MapCanvas
            :map-data="mapData"
            :mode="viewMode"
            :water-level="currentWaterLevel"
            :beach-threshold="beachThreshold"
            :hills-threshold="hillsThreshold"
            :resource-placement-mode="interactionMode === 'place' && !!selectedResourceType"
            :pending-resource-clusters="pendingResourceClusters"
            @map-click="handleMapClick"
            class="shadow-lg"
          />
        </div>
      </div>

      <!-- No map selected -->
      <div v-else class="flex items-center justify-center h-full">
        <div class="text-center text-gray-400">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"></path>
          </svg>
          <h3 class="text-xl font-semibold mb-2">Seleziona una mappa</h3>
          <p>Scegli una mappa dalla barra laterale per iniziare l'editing</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import MapCanvas from '../components/MapCanvas.vue'

// Configurazione tipi di risorse (sincronizzata con backend)
const RESOURCE_TYPES = {
  ALPINE_FOREST: {
    id: 'alpine_forest',
    name: 'Foresta Alpina',
    color: '#2d5a27',
    defaultDensity: 0.8,
    defaultRadius: 30,
    defaultCount: 8
  },
  MEDITERRANEAN_FOREST: {
    id: 'mediterranean_forest', 
    name: 'Foresta Mediterranea',
    color: '#4a7c59',
    defaultDensity: 0.7,
    defaultRadius: 35,
    defaultCount: 10
  },
  TROPICAL_FOREST: {
    id: 'tropical_forest',
    name: 'Foresta Tropicale', 
    color: '#228b22',
    defaultDensity: 0.9,
    defaultRadius: 40,
    defaultCount: 12
  },
  STONES: {
    id: 'stones',
    name: 'Pietre',
    color: '#696969',
    defaultDensity: 0.6,
    defaultRadius: 20,
    defaultCount: 6
  },
  METALS: {
    id: 'metals',
    name: 'Metalli',
    color: '#daa520',
    defaultDensity: 0.5,
    defaultRadius: 15,
    defaultCount: 4
  }
}

const route = useRoute()

// Reactive data
const loading = ref(false)
const error = ref(null)
const mapData = ref(null)
const availableMaps = ref([])
const selectedMapName = ref(route.params.mapName || '')
const viewMode = ref('heightmap')
const selectedTexture = ref(0)
const currentWaterLevel = ref(5)
const xmlWaterLevel = ref(5)
const elevationRange = ref({ min: 0, max: 100 })

// Threshold per fasce colore (in percentuale)
const beachThreshold = ref(10)
const hillsThreshold = ref(60)

// Interaction mode
const interactionMode = ref('navigate') // 'navigate' or 'place'

// Resource placement variables
const resourceTypes = ref(RESOURCE_TYPES)
const selectedResourceType = ref(null)
const clusterDensity = ref(0.7)
const clusterRadius = ref(30)
const clusterCount = ref(8)
const pendingResourceClusters = ref([]) // Cluster aggiunti ma non ancora salvati

// Load available maps
const loadAvailableMaps = async () => {
  try {
    const response = await axios.get('/api/maps')
    availableMaps.value = response.data.maps
    
    // Auto-load map if specified in route
    if (selectedMapName.value) {
      await loadMap()
    }
  } catch (err) {
    error.value = 'Errore nel caricamento della lista mappe: ' + err.message
  }
}

// Load specific map
const loadMap = async () => {
  if (!selectedMapName.value) return

  loading.value = true
  error.value = null
  
  try {
    const response = await axios.get(`/api/maps/${selectedMapName.value}`)
    mapData.value = response.data
    
    // Calculate elevation range
    if (response.data.heightmap?.altitudes) {
      const altitudes = response.data.heightmap.altitudes
      let minElev = Infinity
      let maxElev = -Infinity
      
      for (let i = 0; i < altitudes.length; i++) {
        for (let j = 0; j < altitudes[i].length; j++) {
          const alt = altitudes[i][j]
          minElev = Math.min(minElev, alt)
          maxElev = Math.max(maxElev, alt)
        }
      }
      
      elevationRange.value = { min: minElev, max: maxElev }
    }
    
    // Get XML water level
    try {
      const waterHeight = response.data.scenario?.Scenario?.Environment?.[0]?.Water?.[0]?.WaterBody?.[0]?.Height?.[0]
      if (waterHeight) {
        xmlWaterLevel.value = parseFloat(waterHeight)
        currentWaterLevel.value = xmlWaterLevel.value - 20 // Offset per editor (427 -> 407)
      }
    } catch (e) {
      xmlWaterLevel.value = 5
      currentWaterLevel.value = 5
    }
    
    console.log('Map loaded:', {
      name: response.data.name,
      heightmapSize: response.data.heightmap?.size,
      textureCount: response.data.textures?.textureNames?.length,
      entities: response.data.scenario?.Entities?.length || 0,
      elevationRange: elevationRange.value,
      waterLevel: xmlWaterLevel.value
    })
    
  } catch (err) {
    error.value = 'Errore nel caricamento della mappa: ' + err.message
    mapData.value = null
  } finally {
    loading.value = false
  }
}

// Utility functions
const getEnvironmentInfo = () => {
  const env = mapData.value?.scenario?.Environment
  if (!env) return 'N/A'
  
  const skySet = env.SkySet?.[0] || 'unknown'
  return skySet
}

const selectTexture = (index) => {
  selectedTexture.value = index
  console.log('Selected texture:', mapData.value.textures.textureNames[index])
}

// Interaction mode functions
const setInteractionMode = (mode) => {
  interactionMode.value = mode
  if (mode === 'navigate') {
    // Reset resource selection when switching to navigate mode
    selectedResourceType.value = null
  }
  console.log('Interaction mode set to:', mode)
}

// Resource placement functions
const selectResourceType = (resourceTypeKey) => {
  selectedResourceType.value = resourceTypeKey
  const resourceConfig = RESOURCE_TYPES[resourceTypeKey]
  
  // Update cluster parameters to resource defaults
  clusterDensity.value = resourceConfig.defaultDensity
  clusterRadius.value = resourceConfig.defaultRadius
  clusterCount.value = resourceConfig.defaultCount
  
  // Automatically switch to place mode when selecting a resource
  interactionMode.value = 'place'
  
  console.log('Selected resource type:', resourceConfig.name)
}

const placeResourceCluster = (mapX, mapZ) => {
  if (!selectedResourceType.value || !mapData.value) return
  
  // Aggiungi cluster alla lista locale (non salvare ancora)
  const clusterData = {
    id: Date.now(), // ID temporaneo
    resourceType: selectedResourceType.value,
    centerX: mapX,
    centerZ: mapZ,
    density: clusterDensity.value,
    radius: clusterRadius.value,
    count: clusterCount.value,
    timestamp: new Date().toLocaleTimeString()
  }
  
  pendingResourceClusters.value.push(clusterData)
  
  console.log('Cluster aggiunto localmente:', clusterData)
  console.log(`Total cluster pending: ${pendingResourceClusters.value.length}`)
}

const handleMapClick = (clickData) => {
  console.log('Map clicked at:', clickData, 'Mode:', interactionMode.value)
  
  // Only place resources if in place mode and resource is selected
  if (interactionMode.value === 'place' && selectedResourceType.value) {
    placeResourceCluster(clickData.mapX, clickData.mapZ)
  }
  // In navigate mode, clicks are handled by canvas for pan/zoom
}

// Computed per arrotondare automaticamente
const roundedWaterLevel = computed({
  get: () => Math.round(currentWaterLevel.value * 10) / 10,
  set: (value) => currentWaterLevel.value = value
})

const resetWaterLevel = () => {
  currentWaterLevel.value = xmlWaterLevel.value - 20 // Applica offset per editor
}


const saveMap = async () => {
  if (!mapData.value) return
  
  try {
    loading.value = true
    
    // Se ci sono cluster pending, salvali prima
    if (pendingResourceClusters.value.length > 0) {
      console.log(`Saving ${pendingResourceClusters.value.length} pending resource clusters...`)
      
      await axios.post(`/api/maps/${selectedMapName.value}/save-with-resources`, {
        scenario: mapData.value.scenario,
        resourceClusters: pendingResourceClusters.value
      })
      
      // Svuota la lista dei cluster pending
      pendingResourceClusters.value = []
      
      // Ricarica la mappa per mostrare le nuove entità
      await loadMap()
    } else {
      // Salva solo i metadati se non ci sono risorse
      await axios.post(`/api/maps/${selectedMapName.value}/save`, {
        scenario: mapData.value.scenario
      })
    }
    
    alert('Mappa salvata con successo!')
  } catch (err) {
    error.value = 'Errore nel salvataggio: ' + err.message
  } finally {
    loading.value = false
  }
}

const clearPendingClusters = () => {
  if (confirm(`Sei sicuro di voler annullare ${pendingResourceClusters.value.length} cluster pending?`)) {
    pendingResourceClusters.value = []
    console.log('Cluster pending cancellati')
  }
}

const exportMap = () => {
  if (!mapData.value) return
  
  // Create downloadable JSON
  const dataStr = JSON.stringify(mapData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedMapName.value}_export.json`
  link.click()
  
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadAvailableMaps()
})
</script>

<style scoped>
.canvas-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
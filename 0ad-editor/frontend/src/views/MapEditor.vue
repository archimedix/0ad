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
            <div>Corrente: {{ currentWaterLevel.toFixed(1) }}m</div>
            <div class="text-xs text-gray-400">
              XML: {{ xmlWaterLevel.toFixed(1) }}m
            </div>
          </div>
          <div>
            <input
              type="range"
              v-model.number="currentWaterLevel"
              :min="elevationRange.min - 5"
              :max="elevationRange.max"
              :step="0.1"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            >
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
          >
            Salva Mappa
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
      <div v-else-if="mapData" class="flex items-center justify-center h-full">
        <MapCanvas
          :map-data="mapData"
          :mode="viewMode"
          :water-level="currentWaterLevel"
          class="shadow-lg"
        />
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import MapCanvas from '../components/MapCanvas.vue'

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
        xmlWaterLevel.value = parseFloat(waterHeight) / 10 // Convert to meters
        currentWaterLevel.value = xmlWaterLevel.value
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

const resetWaterLevel = () => {
  currentWaterLevel.value = xmlWaterLevel.value
}

const saveMap = async () => {
  if (!mapData.value) return
  
  try {
    loading.value = true
    await axios.post(`/api/maps/${selectedMapName.value}/save`, {
      scenario: mapData.value.scenario
    })
    
    alert('Mappa salvata con successo!')
  } catch (err) {
    error.value = 'Errore nel salvataggio: ' + err.message
  } finally {
    loading.value = false
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
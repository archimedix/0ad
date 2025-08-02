<template>
  <div class="h-screen bg-gray-900 flex overflow-hidden">
    <!-- Left Drawer with Tabs (full height) -->
    <DrawerTabs
      :map-data="mapData"
      :available-maps="availableMaps"
      :selected-map-name="selectedMapName"
      :loading="loading"
      :error="error"
      :elevation-range="elevationRange"
      :view-mode="viewMode"
      :current-water-level="currentWaterLevel"
      :xml-water-level="xmlWaterLevel"
      :beach-threshold="beachThreshold"
      :hills-threshold="hillsThreshold"
      :interaction-mode="interactionMode"
      :resource-types="resourceTypes"
      :selected-resource-type="selectedResourceType"
      :cluster-density="clusterDensity"
      :cluster-radius="clusterRadius"
      :cluster-count="clusterCount"
      :pending-resource-clusters="pendingResourceClusters"
      @load-map="loadMap"
      @map-selected="handleMapSelected"
      @update:view-mode="viewMode = $event"
      @update:water-level="currentWaterLevel = $event"
      @update:beach-threshold="beachThreshold = $event"
      @update:hills-threshold="hillsThreshold = $event"
      @reset-water-level="resetWaterLevel"
      @set-interaction-mode="setInteractionMode"
      @select-resource-type="selectResourceType"
      @update:cluster-density="clusterDensity = $event"
      @update:cluster-radius="clusterRadius = $event"
      @update:cluster-count="clusterCount = $event"
      @clear-pending-clusters="clearPendingClusters"
    />

    <!-- Central Area -->
    <div class="flex-1 flex flex-col">
      <!-- Central Navbar (only when map is loaded) -->
      <CentralNavbar
        v-if="mapData"
        :interaction-mode="interactionMode"
        :view-mode="viewMode"
        :pending-resource-clusters="pendingResourceClusters"
        :selected-resource-type="selectedResourceType"
        :resource-types="resourceTypes"
        @set-interaction-mode="setInteractionMode"
        @save-map="saveMap"
        @clear-pending-clusters="clearPendingClusters"
      />

      <!-- Canvas Area -->
      <div class="flex-1 flex flex-col">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center flex-1">
          <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p class="text-gray-400">Caricamento mappa...</p>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="flex items-center justify-center flex-1">
          <div class="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md">
            <h3 class="text-red-300 font-semibold mb-2">Errore</h3>
            <p class="text-red-200">{{ error }}</p>
          </div>
        </div>

        <!-- Map canvas -->
        <div v-else-if="mapData" class="flex-1 flex items-center justify-center p-4">
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
        <div v-else class="flex items-center justify-center flex-1">
          <div class="text-center text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"></path>
            </svg>
            <h3 class="text-xl font-semibold mb-2">Seleziona una mappa</h3>
            <p>Scegli una mappa dal pannello laterale per iniziare l'editing</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="showToast"
        class="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import MapCanvas from '../components/MapCanvas.vue'
import DrawerTabs from '../components/DrawerTabs.vue'
import CentralNavbar from '../components/CentralNavbar.vue'

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
const selectedMapName = ref(route.params.mapName || localStorage.getItem('selectedMapName') || '')
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

// Toast notifications
const toastMessage = ref('')
const showToast = ref(false)

const showToastMessage = (message, duration = 3000) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, duration)
}

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

// Handle map selection from dropdown
const handleMapSelected = (mapName) => {
  selectedMapName.value = mapName
  // Save to localStorage for persistence
  if (mapName) {
    localStorage.setItem('selectedMapName', mapName)
  } else {
    localStorage.removeItem('selectedMapName')
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
    
    // Save to localStorage when map is successfully loaded
    localStorage.setItem('selectedMapName', selectedMapName.value)
    
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
    
    showToastMessage('Mappa salvata con successo!')
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
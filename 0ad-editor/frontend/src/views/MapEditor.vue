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
      @load-map="enhancedLoadMap"
      @map-selected="handleMapSelected"
      @update:view-mode="viewMode = $event"
      @update:water-level="currentWaterLevel = $event"
      @update:beach-threshold="beachThreshold = $event"
      @update:hills-threshold="hillsThreshold = $event"
      @reset-water-level="enhancedResetWaterLevel"
      @set-interaction-mode="enhancedSetInteractionMode"
      @select-resource-type="enhancedSelectResourceType"
      @update:cluster-density="clusterDensity = $event"
      @update:cluster-radius="clusterRadius = $event"
      @update:cluster-count="clusterCount = $event"
      @clear-pending-clusters="enhancedClearPendingClusters"
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
        @set-interaction-mode="enhancedSetInteractionMode"
        @save-map="saveMap"
        @clear-pending-clusters="enhancedClearPendingClusters"
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
              @map-click="enhancedHandleMapClick"
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
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MapCanvas from '../components/MapCanvas.vue'
import DrawerTabs from '../components/DrawerTabs.vue'
import CentralNavbar from '../components/CentralNavbar.vue'

// Composables
import { useMapManagement } from '../composables/useMapManagement.js'
import { useResourceManagement } from '../composables/useResourceManagement.js'
import { useUIState } from '../composables/useUIState.js'

const route = useRoute()

// Initialize composables
const mapManagement = useMapManagement()
const resourceManagement = useResourceManagement()
const uiState = useUIState()

// Destructure for template access
const {
  loading,
  error,
  mapData,
  availableMaps,
  selectedMapName,
  elevationRange,
  xmlWaterLevel,
  loadAvailableMaps,
  handleMapSelected,
  loadMap
} = mapManagement

const {
  resourceTypes,
  selectedResourceType,
  clusterDensity,
  clusterRadius,
  clusterCount,
  pendingResourceClusters,
  selectResourceType,
  clearPendingClusters
} = resourceManagement

const {
  viewMode,
  currentWaterLevel,
  beachThreshold,
  hillsThreshold,
  interactionMode,
  toastMessage,
  showToast,
  setInteractionMode,
  resetWaterLevel,
  showToastMessage,
  handleMapClick
} = uiState

// Enhanced methods with composable integration
const enhancedSelectResourceType = (resourceTypeKey) => {
  selectResourceType(resourceTypeKey)
  // Automatically switch to place mode when selecting a resource
  setInteractionMode('place')
}

const enhancedSetInteractionMode = (mode) => {
  setInteractionMode(mode)
  if (mode === 'navigate') {
    // Reset resource selection when switching to navigate mode
    selectedResourceType.value = null
  }
}

const enhancedResetWaterLevel = () => {
  resetWaterLevel(xmlWaterLevel.value)
}

const enhancedHandleMapClick = (clickData) => {
  handleMapClick(clickData, resourceManagement)
}

const enhancedClearPendingClusters = () => {
  const count = clearPendingClusters()
  showToastMessage(`${count} cluster eliminati`)
}


const saveMap = async () => {
  if (!mapData.value) return
  
  try {
    loading.value = true
    
    // Se ci sono cluster pending, salvali prima
    if (pendingResourceClusters.value.length > 0) {
      const savedCount = await resourceManagement.saveResourceClusters(selectedMapName.value, mapData.value)
      
      // Ricarica la mappa per mostrare le nuove entità
      await loadMap(uiState.initializeWaterLevel)
      showToastMessage(`Mappa salvata con ${savedCount} nuovi cluster!`)
    } else {
      // Salva solo i metadati se non ci sono risorse
      await resourceManagement.saveMapOnly(selectedMapName.value, mapData.value)
      showToastMessage('Mappa salvata con successo!')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Enhanced loadMap with water level initialization
const enhancedLoadMap = async () => {
  await loadMap(uiState.initializeWaterLevel)
}


onMounted(() => {
  // Initialize map name from route or localStorage
  mapManagement.initializeFromRoute(route.params.mapName)
  
  loadAvailableMaps(uiState.initializeWaterLevel)
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
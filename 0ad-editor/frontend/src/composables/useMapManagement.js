import { ref, computed } from 'vue'
import axios from 'axios'

export function useMapManagement() {
  // State
  const loading = ref(false)
  const error = ref(null)
  const mapData = ref(null)
  const availableMaps = ref([])
  const selectedMapName = ref('')
  const elevationRange = ref({ min: 0, max: 100 })
  const xmlWaterLevel = ref(5)

  // Computed
  const isMapLoaded = computed(() => !!mapData.value)
  const entityCount = computed(() => {
    return mapData.value?.scenario?.Entities?.length || 0
  })

  // Methods
  const loadAvailableMaps = async (uiStateCallback = null) => {
    try {
      const response = await axios.get('/api/maps')
      availableMaps.value = response.data.maps
      
      // Auto-load map if specified
      if (selectedMapName.value) {
        await loadMap(uiStateCallback)
      }
    } catch (err) {
      error.value = 'Errore nel caricamento della lista mappe: ' + err.message
    }
  }

  const handleMapSelected = (mapName) => {
    selectedMapName.value = mapName
    // Save to localStorage for persistence
    if (mapName) {
      localStorage.setItem('selectedMapName', mapName)
    } else {
      localStorage.removeItem('selectedMapName')
    }
  }

  const loadMap = async (uiStateCallback = null) => {
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
          // Initialize UI water level with offset when map loads
          if (uiStateCallback) {
            uiStateCallback(xmlWaterLevel.value)
          }
        }
      } catch (e) {
        xmlWaterLevel.value = 5
        if (uiStateCallback) {
          uiStateCallback(5)
        }
      }
      
      console.log('Map loaded:', {
        name: response.data.name,
        heightmapSize: response.data.heightmap?.size,
        textureCount: response.data.textures?.textureNames?.length,
        entities: entityCount.value,
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

  const initializeFromRoute = (routeMapName) => {
    const storedMapName = localStorage.getItem('selectedMapName')
    selectedMapName.value = routeMapName || storedMapName || ''
  }

  return {
    // State
    loading,
    error,
    mapData,
    availableMaps,
    selectedMapName,
    elevationRange,
    xmlWaterLevel,
    
    // Computed
    isMapLoaded,
    entityCount,
    
    // Methods
    loadAvailableMaps,
    handleMapSelected,
    loadMap,
    initializeFromRoute
  }
}
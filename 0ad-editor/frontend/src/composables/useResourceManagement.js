import { ref, computed } from 'vue'
import axios from 'axios'

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

export function useResourceManagement() {
  // State
  const resourceTypes = ref(RESOURCE_TYPES)
  const selectedResourceType = ref(null)
  const clusterDensity = ref(0.7)
  const clusterRadius = ref(30)
  const clusterCount = ref(8)
  const pendingResourceClusters = ref([])

  // Computed
  const hasPendingClusters = computed(() => pendingResourceClusters.value.length > 0)
  const pendingClustersCount = computed(() => pendingResourceClusters.value.length)

  // Methods
  const selectResourceType = (resourceTypeKey) => {
    selectedResourceType.value = resourceTypeKey
    const resourceConfig = RESOURCE_TYPES[resourceTypeKey]
    
    // Update cluster parameters to resource defaults
    clusterDensity.value = resourceConfig.defaultDensity
    clusterRadius.value = resourceConfig.defaultRadius
    clusterCount.value = resourceConfig.defaultCount
    
    console.log('Selected resource type:', resourceConfig.name)
  }

  const placeResourceCluster = (mapX, mapZ) => {
    if (!selectedResourceType.value) return
    
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

  const clearPendingClusters = () => {
    const clusterCount = pendingResourceClusters.value.length
    pendingResourceClusters.value = []
    console.log('Cluster pending cancellati')
    return clusterCount
  }

  const saveResourceClusters = async (selectedMapName, mapData) => {
    if (!selectedMapName || !mapData || pendingResourceClusters.value.length === 0) {
      return false
    }

    try {
      console.log(`Saving ${pendingResourceClusters.value.length} pending resource clusters...`)
      
      await axios.post(`/api/maps/${selectedMapName}/save-with-resources`, {
        scenario: mapData.scenario,
        resourceClusters: pendingResourceClusters.value
      })
      
      // Svuota la lista dei cluster pending
      const savedCount = pendingResourceClusters.value.length
      pendingResourceClusters.value = []
      
      return savedCount
    } catch (error) {
      throw new Error('Errore nel salvataggio delle risorse: ' + error.message)
    }
  }

  const saveMapOnly = async (selectedMapName, mapData) => {
    if (!selectedMapName || !mapData) {
      return false
    }

    try {
      await axios.post(`/api/maps/${selectedMapName}/save`, {
        scenario: mapData.scenario
      })
      return true
    } catch (error) {
      throw new Error('Errore nel salvataggio della mappa: ' + error.message)
    }
  }

  return {
    // State
    resourceTypes,
    selectedResourceType,
    clusterDensity,
    clusterRadius,
    clusterCount,
    pendingResourceClusters,
    
    // Computed
    hasPendingClusters,
    pendingClustersCount,
    
    // Methods
    selectResourceType,
    placeResourceCluster,
    clearPendingClusters,
    saveResourceClusters,
    saveMapOnly
  }
}
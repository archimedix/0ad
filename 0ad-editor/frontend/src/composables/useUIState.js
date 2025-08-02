import { ref, computed } from 'vue'

export function useUIState() {
  // State
  const viewMode = ref('heightmap')
  const currentWaterLevel = ref(5)
  const beachThreshold = ref(10)
  const hillsThreshold = ref(60)
  const interactionMode = ref('navigate') // 'navigate' or 'place'
  
  // Toast notifications
  const toastMessage = ref('')
  const showToast = ref(false)

  // Computed
  const roundedWaterLevel = computed({
    get: () => Math.round(currentWaterLevel.value * 10) / 10,
    set: (value) => currentWaterLevel.value = value
  })

  const isPlaceMode = computed(() => interactionMode.value === 'place')
  const isNavigateMode = computed(() => interactionMode.value === 'navigate')

  // Methods
  const setInteractionMode = (mode) => {
    interactionMode.value = mode
    console.log('Interaction mode set to:', mode)
  }

  const resetWaterLevel = (xmlWaterLevel) => {
    currentWaterLevel.value = xmlWaterLevel - 20 // Applica offset per editor
  }

  const showToastMessage = (message, duration = 3000) => {
    toastMessage.value = message
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, duration)
  }

  const handleMapClick = (clickData, resourceManagement) => {
    console.log('Map clicked at:', clickData, 'Mode:', interactionMode.value)
    
    // Only place resources if in place mode and resource is selected
    if (interactionMode.value === 'place' && resourceManagement.selectedResourceType.value) {
      resourceManagement.placeResourceCluster(clickData.mapX, clickData.mapZ)
    }
    // In navigate mode, clicks are handled by canvas for pan/zoom
  }

  const initializeWaterLevel = (xmlWaterLevel) => {
    currentWaterLevel.value = xmlWaterLevel - 20 // Offset per editor (427 -> 407)
  }

  return {
    // State
    viewMode,
    currentWaterLevel,
    beachThreshold,
    hillsThreshold,
    interactionMode,
    toastMessage,
    showToast,
    
    // Computed
    roundedWaterLevel,
    isPlaceMode,
    isNavigateMode,
    
    // Methods
    setInteractionMode,
    resetWaterLevel,
    showToastMessage,
    handleMapClick,
    initializeWaterLevel
  }
}
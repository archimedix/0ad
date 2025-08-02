<template>
  <div class="map-canvas-container relative">
    <canvas
      ref="canvas"
      :width="canvasSize"
      :height="canvasSize"
      class="map-canvas border border-gray-600 cursor-crosshair"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @wheel.prevent="onWheel"
    ></canvas>
    
    <!-- Map info overlay -->
    <div class="absolute top-4 left-4 bg-black bg-opacity-60 rounded-lg p-3 text-sm">
      <div class="text-gray-300">
        <div>Dimensioni: {{ mapData?.heightmap?.mapDim || 0 }} unità</div>
        <div>Heightmap: {{ mapData?.heightmap?.size || 0 }}x{{ mapData?.heightmap?.size || 0 }}</div>
        <div>Texture: {{ mapData?.textures?.textureNames?.length || 0 }}</div>
        <div v-if="mousePos">Mouse: {{ mousePos.x }}, {{ mousePos.y }}</div>
        <div v-if="elevation !== null">Elevazione: {{ elevation.toFixed(1) }}m</div>
      </div>
    </div>

    <!-- Zoom controls -->
    <div class="absolute top-4 right-4 flex flex-col space-y-2">
      <button
        @click="zoomIn"
        class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
      >
        +
      </button>
      <button
        @click="zoomOut"
        class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
      >
        -
      </button>
      <button
        @click="resetZoom"
        class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
      >
        1:1
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  mapData: Object,
  mode: {
    type: String,
    default: 'heightmap' // 'heightmap', 'texture', 'entities'
  },
  waterLevel: {
    type: Number,
    default: null // Will use XML data if null
  }
})

const canvas = ref(null)
const canvasSize = 800
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const mousePos = ref(null)
const elevation = ref(null)

// Computed properties
const effectiveSize = computed(() => canvasSize * zoom.value)

// Watch for map data changes
watch(() => props.mapData, () => {
  if (props.mapData) {
    nextTick(() => {
      renderMap()
    })
  }
}, { deep: true })

// Watch for water level changes
watch(() => props.waterLevel, () => {
  if (props.mapData) {
    nextTick(() => {
      renderMap()
    })
  }
})

// Canvas rendering functions
const renderMap = () => {
  if (!canvas.value || !props.mapData) return

  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, canvasSize, canvasSize)

  if (props.mode === 'heightmap') {
    renderHeightmap(ctx)
  } else if (props.mode === 'texture') {
    renderTextures(ctx)
  }
}

const renderHeightmap = (ctx) => {
  const { heightmap } = props.mapData
  if (!heightmap?.altitudes) return

  const { altitudes, size } = heightmap
  const imageData = ctx.createImageData(canvasSize, canvasSize)
  
  // Get water level (from prop or scenario data)
  let waterLevel = props.waterLevel
  if (waterLevel === null) {
    waterLevel = 5 // Default fallback
    try {
      const waterHeight = props.mapData?.scenario?.Scenario?.Environment?.[0]?.Water?.[0]?.WaterBody?.[0]?.Height?.[0]
      if (waterHeight) {
        waterLevel = parseFloat(waterHeight) // Keep 0AD units (427 -> 427)
      }
    } catch (e) {
      console.warn('Could not read water level, using default:', waterLevel)
    }
  }
  
  // Find min/max elevations for color mapping
  let minElevation = Infinity
  let maxElevation = -Infinity
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const alt = altitudes[i][j]
      minElevation = Math.min(minElevation, alt)
      maxElevation = Math.max(maxElevation, alt)
    }
  }
  
  console.log(`Water level: ${waterLevel}m, Elevation range: ${minElevation.toFixed(1)}m to ${maxElevation.toFixed(1)}m`)
  
  // Render heightmap as colored pixels
  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      // Map canvas coordinates to heightmap coordinates (flip Y axis)
      const mapX = Math.floor((x / canvasSize) * size)
      const mapY = Math.floor(((canvasSize - 1 - y) / canvasSize) * size)
      
      if (mapX < size && mapY < size) {
        const alt = altitudes[mapY][mapX]
        
        // Color mapping based on actual elevation and water level
        let r, g, b
        
        if (alt <= waterLevel) {
          // Underwater - deep blue to shallow blue
          const depth = Math.max(0, waterLevel - alt)
          const maxDepth = Math.max(5, waterLevel - minElevation) // Avoid division by zero
          const depthRatio = Math.min(1, depth / maxDepth)
          
          // Deep water = dark blue, shallow water = light blue (invertito)
          r = Math.floor(70 - depthRatio * 50)     // 70-20
          g = Math.floor(200 - depthRatio * 100)   // 200-100  
          b = Math.floor(255 - depthRatio * 55)    // 255-200
          
        } else {
          // Above water - land colors
          const landHeight = alt - waterLevel
          const maxLandHeight = Math.max(10, maxElevation - waterLevel)
          const heightRatio = Math.min(1, landHeight / maxLandHeight)
          
          if (heightRatio < 0.1) {
            // Beach/lowland - sandy/green
            r = Math.floor(150 + heightRatio * 10 * 50)   // Sandy (aggiustato per 0.1)
            g = Math.floor(180 + heightRatio * 10 * 75)   // Green (aggiustato per 0.1)
            b = Math.floor(80 + heightRatio * 10 * 20)
          } else if (heightRatio < 0.6) {
            // Hills - green to brown
            const t = (heightRatio - 0.1) / 0.5
            r = Math.floor(100 + t * 139)
            g = Math.floor(200 - t * 100)
            b = Math.floor(80 + t * 50)
          } else {
            // Mountains - brown to white/snow
            const t = (heightRatio - 0.6) / 0.4
            r = Math.floor(139 + t * 116)
            g = Math.floor(120 + t * 135)
            b = Math.floor(100 + t * 155)
          }
        }
        
        const pixelIndex = (y * canvasSize + x) * 4
        imageData.data[pixelIndex] = r
        imageData.data[pixelIndex + 1] = g
        imageData.data[pixelIndex + 2] = b
        imageData.data[pixelIndex + 3] = 255
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
}

const renderTextures = (ctx) => {
  // TODO: Implement texture rendering
  // For now, show a placeholder
  ctx.fillStyle = '#444'
  ctx.fillRect(0, 0, canvasSize, canvasSize)
  ctx.fillStyle = '#888'
  ctx.font = '20px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Texture View', canvasSize / 2, canvasSize / 2)
  ctx.fillText('(Coming Soon)', canvasSize / 2, canvasSize / 2 + 30)
}

// Mouse interaction handlers
const onMouseDown = (event) => {
  isDragging.value = true
  lastMousePos.value = { x: event.clientX, y: event.clientY }
  updateMouseInfo(event)
}

const onMouseMove = (event) => {
  updateMouseInfo(event)
  
  if (isDragging.value) {
    const deltaX = event.clientX - lastMousePos.value.x
    const deltaY = event.clientY - lastMousePos.value.y
    
    panX.value += deltaX / zoom.value
    panY.value += deltaY / zoom.value
    
    lastMousePos.value = { x: event.clientX, y: event.clientY }
  }
}

const onMouseUp = () => {
  isDragging.value = false
}

const onWheel = (event) => {
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  zoom.value = Math.max(0.1, Math.min(5, zoom.value * delta))
  // TODO: Apply zoom transformation
}

const updateMouseInfo = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  mousePos.value = { x: Math.floor(x), y: Math.floor(y) }
  
  // Calculate elevation at mouse position
  if (props.mapData?.heightmap?.altitudes) {
    const { altitudes, size } = props.mapData.heightmap
    const mapX = Math.floor((x / canvasSize) * size)
    const mapY = Math.floor(((canvasSize - 1 - y) / canvasSize) * size)
    
    // Check bounds more carefully (including negative values)
    if (mapX >= 0 && mapX < size && mapY >= 0 && mapY < size && altitudes[mapY]) {
      elevation.value = altitudes[mapY][mapX]
    } else {
      elevation.value = null
    }
  }
}

// Zoom controls
const zoomIn = () => {
  zoom.value = Math.min(5, zoom.value * 1.2)
  applyCanvasTransform()
}

const zoomOut = () => {
  zoom.value = Math.max(0.1, zoom.value / 1.2)
  applyCanvasTransform()
}

const resetZoom = () => {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  applyCanvasTransform()
}

const applyCanvasTransform = () => {
  const canvasElement = canvas.value
  if (!canvasElement) return
  
  canvasElement.style.transform = `scale(${zoom.value}) translate(${panX.value}px, ${panY.value}px)`
  canvasElement.style.transformOrigin = 'center center'
}

// Watch per applicare trasformazioni quando cambiano zoom/pan
watch([zoom, panX, panY], () => {
  applyCanvasTransform()
})

onMounted(() => {
  if (props.mapData) {
    renderMap()
  }
  applyCanvasTransform()
})
</script>

<style scoped>
.map-canvas-container {
  display: inline-block;
  overflow: hidden;
  position: relative;
  max-width: 100%;
  max-height: 100vh;
}

.map-canvas {
  transition: transform 0.1s ease-out;
}
</style>
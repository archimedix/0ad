<template>
  <div class="map-canvas-container relative">
    <canvas
      ref="canvas"
      :width="canvasSize"
      :height="canvasSize"
      class="map-canvas border border-gray-600"
      :class="resourcePlacementMode ? 'cursor-crosshair' : 'cursor-move'"
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
        <div v-if="entityCount > 0">Entità: {{ entityCount }}</div>
        <div v-if="pendingResourceClusters.length > 0" class="text-yellow-300">Pending: {{ pendingResourceClusters.length }} cluster</div>
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
  },
  beachThreshold: {
    type: Number,
    default: 10
  },
  hillsThreshold: {
    type: Number,
    default: 60
  },
  resourcePlacementMode: {
    type: Boolean,
    default: false
  },
  pendingResourceClusters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['mapClick'])

const canvas = ref(null)
const canvasSize = 800
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })
const mousePos = ref(null)
const elevation = ref(null)

// Player colors for civil centers (default 0 A.D. colors)
const playerColors = [
  { r: 128, g: 128, b: 128 }, // Player 0 (Gaia) - gray
  { r: 255, g: 255, b: 255 }, // Player 1 - white (fallback)
  { r: 255, g: 0, b: 0 },     // Player 2 - red
  { r: 0, g: 255, b: 0 },     // Player 3 - green
  { r: 0, g: 0, b: 255 },     // Player 4 - blue
  { r: 255, g: 255, b: 0 },   // Player 5 - yellow
  { r: 255, g: 0, b: 255 },   // Player 6 - magenta
  { r: 0, g: 255, b: 255 },   // Player 7 - cyan
  { r: 255, g: 128, b: 0 }    // Player 8 - orange
]

// Computed properties
const effectiveSize = computed(() => canvasSize * zoom.value)
const entityCount = computed(() => {
  return props.mapData?.scenario?.Scenario?.Entities?.[0]?.Entity?.length || 0
})

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

// Watch for color threshold changes
watch([() => props.beachThreshold, () => props.hillsThreshold], () => {
  if (props.mapData) {
    nextTick(() => {
      renderMap()
    })
  }
})

// Watch for pending resource clusters changes
watch(() => props.pendingResourceClusters, () => {
  if (props.mapData) {
    nextTick(() => {
      renderMap()
    })
  }
}, { deep: true })

// Canvas rendering functions
const renderMap = () => {
  if (!canvas.value || !props.mapData) return

  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, canvasSize, canvasSize)

  if (props.mode === 'heightmap') {
    renderHeightmap(ctx)
    renderEntities(ctx)
  } else if (props.mode === 'texture') {
    renderTextures(ctx)
    renderEntities(ctx)
  } else if (props.mode === 'entities') {
    // Simple background for entities mode
    ctx.fillStyle = '#222'
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    renderEntities(ctx)
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
          
          const beachLimit = props.beachThreshold / 100
          const hillsLimit = props.hillsThreshold / 100
          
          if (heightRatio < beachLimit) {
            // Beach/lowland - sandy/green
            const beachRatio = heightRatio / beachLimit
            r = Math.floor(150 + beachRatio * 50)
            g = Math.floor(180 + beachRatio * 75)
            b = Math.floor(80 + beachRatio * 20)
          } else if (heightRatio < hillsLimit) {
            // Hills - green to brown
            const t = (heightRatio - beachLimit) / (hillsLimit - beachLimit)
            r = Math.floor(100 + t * 139)
            g = Math.floor(200 - t * 100)
            b = Math.floor(80 + t * 50)
          } else {
            // Mountains - brown to white/snow
            const t = (heightRatio - hillsLimit) / (1 - hillsLimit)
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

const renderEntities = (ctx) => {
  if (!props.mapData?.scenario?.Scenario?.Entities?.[0]?.Entity) return
  
  const entities = props.mapData.scenario.Scenario.Entities[0].Entity
  const { mapDim } = props.mapData.heightmap
  
  // Get player data for colors
  let playerData = []
  try {
    const scriptSettings = props.mapData.scenario.Scenario.ScriptSettings?.[0]
    if (scriptSettings) {
      const settings = JSON.parse(scriptSettings)
      playerData = settings.PlayerData || []
    }
  } catch (e) {
    console.warn('Could not parse player data:', e)
  }
  
  // Render existing entities from XML
  entities.forEach(entity => {
    renderEntity(ctx, entity, mapDim, playerData)
  })
  
  // Render pending resource clusters
  props.pendingResourceClusters.forEach(cluster => {
    renderPendingCluster(ctx, cluster, mapDim)
  })
}

const renderEntity = (ctx, entity, mapDim, playerData) => {
  const position = entity.Position?.[0]
  if (!position || !position.$ || position.$.x === undefined || position.$.z === undefined) return
  
  const worldX = parseFloat(position.$.x)
  const worldZ = parseFloat(position.$.z)
  
  // Convert world coordinates to canvas coordinates
  const canvasX = (worldX / mapDim) * canvasSize
  const canvasY = canvasSize - ((worldZ / mapDim) * canvasSize) // Flip Y axis
  
  const template = entity.Template?.[0] || ''
  const playerId = parseInt(entity.Player?.[0] || 0)
  
  // Determine entity type and render accordingly
  if (template.includes('civil_centre')) {
    renderCivilCenter(ctx, canvasX, canvasY, playerId, playerData)
  } else if (playerId === 0) {
    // Gaia entities (resources, fauna, etc.)
    renderGaiaEntity(ctx, canvasX, canvasY, template)
  } else {
    // Other player entities (units, buildings)
    renderPlayerEntity(ctx, canvasX, canvasY, playerId, playerData, template)
  }
}

const renderCivilCenter = (ctx, x, y, playerId, playerData) => {
  // Get player color
  let color = playerColors[Math.min(playerId, playerColors.length - 1)]
  
  // Override with actual player color if available
  if (playerData[playerId]?.Color) {
    const playerColor = playerData[playerId].Color
    color = { r: playerColor.r, g: playerColor.g, b: playerColor.b }
  }
  
  // Draw civil center as larger square
  const size = 8
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
  ctx.fillRect(x - size/2, y - size/2, size, size)
  
  // Add border for visibility
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.strokeRect(x - size/2, y - size/2, size, size)
}

const renderGaiaEntity = (ctx, x, y, template) => {
  // Gaia resources as small gray pixels
  ctx.fillStyle = '#808080' // Gray
  ctx.fillRect(x - 1, y - 1, 2, 2)
}

const renderPlayerEntity = (ctx, x, y, playerId, playerData, template) => {
  // Get player color
  let color = playerColors[Math.min(playerId, playerColors.length - 1)]
  
  // Override with actual player color if available
  if (playerData[playerId]?.Color) {
    const playerColor = playerData[playerId].Color
    color = { r: playerColor.r, g: playerColor.g, b: playerColor.b }
  }
  
  // Render as small colored dot
  const size = template.includes('structure') ? 4 : 2
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
  ctx.fillRect(x - size/2, y - size/2, size, size)
}

const renderPendingCluster = (ctx, cluster, mapDim) => {
  // Convert game coordinates to canvas coordinates
  const canvasX = (cluster.centerX / mapDim) * canvasSize
  const canvasY = canvasSize - ((cluster.centerZ / mapDim) * canvasSize) // Flip Y axis
  
  // Save context state
  ctx.save()
  
  // Apply the same transforms that CSS applies (but inverse for drawing)
  ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
  
  // Calculate transformed coordinates by applying CSS transform manually
  const centerX = canvasSize / 2
  const centerY = canvasSize / 2
  
  // Apply zoom and pan to coordinates (same as CSS transform)
  const transformedX = (canvasX - centerX) * zoom.value + panX.value * zoom.value + centerX
  const transformedY = (canvasY - centerY) * zoom.value + panY.value * zoom.value + centerY
  const transformedRadius = (cluster.radius * (canvasSize / mapDim)) * zoom.value
  
  // Draw pending cluster center as highlighted circle
  ctx.strokeStyle = '#ffff00' // Yellow
  ctx.lineWidth = 2 / zoom.value // Adjust line width for zoom
  ctx.beginPath()
  ctx.arc(transformedX, transformedY, transformedRadius, 0, 2 * Math.PI)
  ctx.stroke()
  
  // Draw center point
  ctx.fillStyle = '#ffff00'
  const pointSize = 4 * zoom.value
  ctx.fillRect(transformedX - pointSize/2, transformedY - pointSize/2, pointSize, pointSize)
  
  // Restore context state
  ctx.restore()
}

// Mouse interaction handlers
const onMouseDown = (event) => {
  // Se siamo in modalità piazzamento risorse, gestisci il click
  if (props.resourcePlacementMode) {
    handleMapClick(event)
    return
  }
  
  isDragging.value = true
  lastMousePos.value = { x: event.clientX, y: event.clientY }
  updateMouseInfo(event)
}

const handleMapClick = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  
  // Adjust for CSS transforms (zoom and pan)
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // Apply inverse transforms to get actual canvas coordinates
  x = (x - centerX) / zoom.value - panX.value + centerX
  y = (y - centerY) / zoom.value - panY.value + centerY
  
  // Ensure coordinates are within canvas bounds
  x = Math.max(0, Math.min(canvasSize, x))
  y = Math.max(0, Math.min(canvasSize, y))
  
  // Converti coordinate canvas in coordinate di gioco (mapDim, non heightmap size)
  if (props.mapData?.heightmap) {
    const { mapDim } = props.mapData.heightmap
    
    // Coordinate di gioco: da coordinate canvas a coordinate mondo 0AD
    const gameX = (x / canvasSize) * mapDim
    const gameZ = ((canvasSize - 1 - y) / canvasSize) * mapDim
    
    console.log(`Canvas click: (${x.toFixed(1)}, ${y.toFixed(1)}) -> Game coords: (${gameX.toFixed(1)}, ${gameZ.toFixed(1)}) in world ${mapDim}x${mapDim}, zoom: ${zoom.value.toFixed(2)}`)
    
    // Emetti evento con coordinate di gioco
    emit('mapClick', { mapX: gameX, mapZ: gameZ, canvasX: x, canvasY: y })
  }
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
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  
  // Adjust for CSS transforms (zoom and pan) - same as handleMapClick
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  x = (x - centerX) / zoom.value - panX.value + centerX
  y = (y - centerY) / zoom.value - panY.value + centerY
  
  // Mostra coordinate di gioco invece che canvas
  if (props.mapData?.heightmap?.mapDim) {
    const { mapDim } = props.mapData.heightmap
    const gameX = (x / canvasSize) * mapDim
    const gameZ = ((canvasSize - 1 - y) / canvasSize) * mapDim
    mousePos.value = { x: Math.floor(gameX), y: Math.floor(gameZ) }
  } else {
    mousePos.value = { x: Math.floor(x), y: Math.floor(y) }
  }
  
  // Calculate elevation at mouse position (usa ancora griglia heightmap per altitudine)
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
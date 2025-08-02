<template>
  <div class="p-4">
    <!-- Map selector -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-white mb-3">Mappa</h2>
      <select
        :value="selectedMapName"
        @change="handleMapSelection"
        class="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
      >
        <option value="">Seleziona mappa...</option>
        <option v-for="map in availableMaps" :key="map.name" :value="map.name">
          {{ map.name }}
        </option>
      </select>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <p class="text-gray-400 text-sm">Caricamento...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-900 border border-red-700 rounded-lg p-3 mb-4">
      <p class="text-red-300 text-sm">{{ error }}</p>
    </div>

    <!-- Map info -->
    <div v-if="mapData" class="space-y-4">
      <h3 class="text-lg font-semibold text-white">Informazioni Mappa</h3>
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

    <!-- No map selected -->
    <div v-if="!mapData && !loading" class="text-center py-8 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"></path>
      </svg>
      <h3 class="text-lg font-semibold mb-2">Seleziona una mappa</h3>
      <p class="text-sm">Scegli una mappa per iniziare l'editing</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  mapData: Object,
  availableMaps: Array,
  selectedMapName: String,
  loading: Boolean,
  error: String,
  elevationRange: Object
})

const emit = defineEmits(['loadMap', 'mapSelected'])

const handleMapSelection = (event) => {
  const mapName = event.target.value
  emit('mapSelected', mapName)
  if (mapName) {
    emit('loadMap')
  }
}

const getEnvironmentInfo = () => {
  const env = props.mapData?.scenario?.Environment
  if (!env) return 'N/A'
  
  const skySet = env.SkySet?.[0] || 'unknown'
  return skySet
}
</script>
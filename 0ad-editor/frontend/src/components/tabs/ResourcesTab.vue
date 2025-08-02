<template>
  <div class="p-4 space-y-6">
    <!-- Resource placement controls -->
    <div v-if="mapData && viewMode === 'heightmap'">
      <h3 class="text-lg font-semibold text-white mb-3">Selezione Risorse</h3>
      
      <!-- Resource type selection -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 gap-2">
          <div
            v-for="(resourceType, key) in resourceTypes"
            :key="key"
            class="p-3 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors border-2"
            :class="{ 'border-blue-500 bg-gray-600': selectedResourceType === key, 'border-transparent': selectedResourceType !== key }"
            @click="handleResourceSelection(key)"
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
                :value="clusterDensity"
                @input="$emit('update:clusterDensity', parseFloat($event.target.value))"
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
                :value="clusterRadius"
                @input="$emit('update:clusterRadius', parseInt($event.target.value))"
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
                :value="clusterCount"
                @input="$emit('update:clusterCount', parseInt($event.target.value))"
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
          <button
            @click="$emit('clearPendingClusters')"
            class="mt-2 w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
          >
            Cancella Tutti ({{ pendingResourceClusters.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- No resource mode message -->
    <div v-if="!mapData || viewMode !== 'heightmap'" class="text-center py-8 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      <h3 class="text-lg font-semibold mb-2">Modalità Risorse</h3>
      <p class="text-sm">
        <span v-if="!mapData">Carica una mappa per piazzare risorse</span>
        <span v-else-if="viewMode !== 'heightmap'">Passa alla vista Heightmap per piazzare risorse</span>
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  mapData: Object,
  viewMode: String,
  interactionMode: String,
  resourceTypes: Object,
  selectedResourceType: String,
  clusterDensity: Number,
  clusterRadius: Number,
  clusterCount: Number,
  pendingResourceClusters: Array
})

const emit = defineEmits([
  'setInteractionMode',
  'selectResourceType',
  'update:clusterDensity',
  'update:clusterRadius',
  'update:clusterCount',
  'clearPendingClusters'
])

const handleResourceSelection = (resourceKey) => {
  // Quando selezioniamo una risorsa, automaticamente passiamo in modalità piazzamento
  emit('selectResourceType', resourceKey)
  emit('setInteractionMode', 'place')
}
</script>
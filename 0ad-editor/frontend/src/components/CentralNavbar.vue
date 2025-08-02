<template>
  <nav class="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
    <!-- Left: Interaction Mode -->
    <div class="flex items-center space-x-4">
      <span class="text-white font-medium">Modalità:</span>
      <div class="flex space-x-2">
        <button
          @click="$emit('setInteractionMode', 'navigate')"
          class="px-4 py-2 rounded text-sm font-medium transition-colors"
          :class="interactionMode === 'navigate' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          🖱️ Naviga
        </button>
        <button
          @click="$emit('setInteractionMode', 'place')"
          :disabled="viewMode !== 'heightmap'"
          class="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="interactionMode === 'place' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          ➕ Piazza
        </button>
      </div>
      
      <!-- Selected resource indicator -->
      <div v-if="interactionMode === 'place' && selectedResourceType && resourceTypes[selectedResourceType]" 
           class="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded">
        <div 
          class="w-3 h-3 rounded border border-gray-500" 
          :style="{ backgroundColor: resourceTypes[selectedResourceType].color }"
        ></div>
        <span class="text-gray-300 text-sm">{{ resourceTypes[selectedResourceType].name }}</span>
      </div>
    </div>

    <!-- Right: Action Buttons -->
    <div class="flex items-center space-x-3">
      <button
        @click="$emit('saveMap')"
        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
        :class="{ 'bg-green-700': pendingResourceClusters.length > 0 }"
      >
        {{ pendingResourceClusters.length > 0 ? `Salva (${pendingResourceClusters.length})` : 'Salva' }}
      </button>
      
      <button
        v-if="pendingResourceClusters.length > 0"
        @click="$emit('clearPendingClusters')"
        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
      >
        Reset ({{ pendingResourceClusters.length }})
      </button>
    </div>
  </nav>
</template>

<script setup>
defineProps({
  interactionMode: String,
  viewMode: String,
  pendingResourceClusters: Array,
  selectedResourceType: String,
  resourceTypes: Object
})

defineEmits([
  'setInteractionMode',
  'saveMap',
  'clearPendingClusters'
])
</script>
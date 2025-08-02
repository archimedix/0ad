<template>
  <div class="w-80 bg-gray-800 border-r border-gray-700 h-full flex flex-col">
    <!-- Tab Headers -->
    <div class="flex border-b border-gray-700">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex-1 py-3 px-4 text-sm font-medium transition-colors"
        :class="activeTab === tab.id 
          ? 'bg-gray-700 text-white border-b-2 border-blue-500' 
          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-750'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto">
      <InfoTab 
        v-if="activeTab === 'info'"
        :map-data="mapData"
        :available-maps="availableMaps"
        :selected-map-name="selectedMapName"
        :loading="loading"
        :error="error"
        :elevation-range="elevationRange"
        @load-map="$emit('loadMap', $event)"
        @map-selected="$emit('mapSelected', $event)"
      />
      
      <ViewTab
        v-if="activeTab === 'view'"
        :map-data="mapData"
        :view-mode="viewMode"
        :current-water-level="currentWaterLevel"
        :xml-water-level="xmlWaterLevel"
        :elevation-range="elevationRange"
        :beach-threshold="beachThreshold"
        :hills-threshold="hillsThreshold"
        @update:view-mode="$emit('update:viewMode', $event)"
        @update:water-level="$emit('update:waterLevel', $event)"
        @update:beach-threshold="$emit('update:beachThreshold', $event)"
        @update:hills-threshold="$emit('update:hillsThreshold', $event)"
        @reset-water-level="$emit('resetWaterLevel')"
      />
      
      <ResourcesTab
        v-if="activeTab === 'resources'"
        :map-data="mapData"
        :view-mode="viewMode"
        :interaction-mode="interactionMode"
        :resource-types="resourceTypes"
        :selected-resource-type="selectedResourceType"
        :cluster-density="clusterDensity"
        :cluster-radius="clusterRadius"
        :cluster-count="clusterCount"
        :pending-resource-clusters="pendingResourceClusters"
        @set-interaction-mode="$emit('setInteractionMode', $event)"
        @select-resource-type="$emit('selectResourceType', $event)"
        @update:cluster-density="$emit('update:clusterDensity', $event)"
        @update:cluster-radius="$emit('update:clusterRadius', $event)"
        @update:cluster-count="$emit('update:clusterCount', $event)"
        @clear-pending-clusters="$emit('clearPendingClusters')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import InfoTab from './tabs/InfoTab.vue'
import ViewTab from './tabs/ViewTab.vue'
import ResourcesTab from './tabs/ResourcesTab.vue'

const props = defineProps({
  mapData: Object,
  availableMaps: Array,
  selectedMapName: String,
  loading: Boolean,
  error: String,
  elevationRange: Object,
  viewMode: String,
  currentWaterLevel: Number,
  xmlWaterLevel: Number,
  beachThreshold: Number,
  hillsThreshold: Number,
  interactionMode: String,
  resourceTypes: Object,
  selectedResourceType: String,
  clusterDensity: Number,
  clusterRadius: Number,
  clusterCount: Number,
  pendingResourceClusters: Array
})

defineEmits([
  'loadMap',
  'mapSelected',
  'update:viewMode',
  'update:waterLevel',
  'update:beachThreshold',
  'update:hillsThreshold',
  'resetWaterLevel',
  'setInteractionMode',
  'selectResourceType',
  'update:clusterDensity',
  'update:clusterRadius',
  'update:clusterCount',
  'clearPendingClusters'
])

const activeTab = ref('info')

const tabs = [
  { id: 'info', label: 'Info' },
  { id: 'view', label: 'Vista' },
  { id: 'resources', label: 'Risorse' }
]
</script>
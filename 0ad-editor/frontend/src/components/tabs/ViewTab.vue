<template>
  <div class="p-4 space-y-6">
    <!-- View mode -->
    <div>
      <h3 class="text-lg font-semibold text-white mb-3">Modalità Vista</h3>
      <div class="space-y-2">
        <label class="flex items-center space-x-2">
          <input
            type="radio"
            :value="'heightmap'"
            :checked="viewMode === 'heightmap'"
            @change="$emit('update:viewMode', 'heightmap')"
            class="form-radio text-blue-600"
          >
          <span class="text-gray-300">Heightmap</span>
        </label>
        <label class="flex items-center space-x-2">
          <input
            type="radio"
            :value="'texture'"
            :checked="viewMode === 'texture'"
            @change="$emit('update:viewMode', 'texture')"
            class="form-radio text-blue-600"
          >
          <span class="text-gray-300">Texture</span>
        </label>
        <label class="flex items-center space-x-2">
          <input
            type="radio"
            :value="'entities'"
            :checked="viewMode === 'entities'"
            @change="$emit('update:viewMode', 'entities')"
            class="form-radio text-blue-600"
          >
          <span class="text-gray-300">Entità</span>
        </label>
      </div>
    </div>

    <!-- Water level control -->
    <div v-if="mapData && viewMode === 'heightmap'">
      <h3 class="text-lg font-semibold text-white mb-3">Livello Acqua</h3>
      <div class="space-y-3">
        <div class="text-sm text-gray-300">
          <div>Corrente: {{ currentWaterLevel.toFixed(1) }}</div>
          <div class="text-xs text-gray-400">
            XML: {{ xmlWaterLevel.toFixed(1) }}
          </div>
        </div>
        <div class="space-y-2">
          <input
            type="range"
            :value="currentWaterLevel"
            @input="$emit('update:waterLevel', parseFloat($event.target.value))"
            :min="elevationRange.min - 5"
            :max="elevationRange.max"
            :step="0.1"
            class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          >
          <div class="flex items-center space-x-2">
            <label class="text-xs text-gray-400 whitespace-nowrap">Valore preciso:</label>
            <input
              type="number"
              :value="roundedWaterLevel"
              @input="$emit('update:waterLevel', parseFloat($event.target.value))"
              :min="elevationRange.min - 5"
              :max="elevationRange.max"
              :step="0.1"
              class="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-sm rounded focus:outline-none focus:border-blue-500"
              placeholder="Inserisci valore"
            >
            <span class="text-xs text-gray-400">unità</span>
          </div>
        </div>
        <div class="flex space-x-2">
          <button
            @click="$emit('resetWaterLevel')"
            class="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
          >
            Reset XML
          </button>
          <button
            @click="$emit('update:waterLevel', elevationRange.min)"
            class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
          >
            Min
          </button>
        </div>
      </div>
    </div>

    <!-- Color bands control -->
    <div v-if="mapData && viewMode === 'heightmap'">
      <h3 class="text-lg font-semibold text-white mb-3">Fasce Colore Terreno</h3>
      <div class="space-y-3 text-sm">
        <div class="flex items-center space-x-2">
          <label class="text-gray-300 w-20">Spiaggia:</label>
          <span class="text-gray-400 text-xs">0% -</span>
          <input
            type="number"
            :value="beachThreshold"
            @input="$emit('update:beachThreshold', parseInt($event.target.value))"
            min="1"
            max="50"
            step="1"
            class="w-16 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded focus:outline-none focus:border-blue-500"
          >
          <span class="text-gray-400 text-xs">%</span>
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-gray-300 w-20">Colline:</label>
          <span class="text-gray-400 text-xs">{{ beachThreshold }}% -</span>
          <input
            type="number"
            :value="hillsThreshold"
            @input="$emit('update:hillsThreshold', parseInt($event.target.value))"
            :min="beachThreshold + 1"
            max="90"
            step="1"
            class="w-16 px-2 py-1 bg-gray-800 border border-gray-600 text-white text-xs rounded focus:outline-none focus:border-blue-500"
          >
          <span class="text-gray-400 text-xs">%</span>
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-gray-300 w-20">Montagne:</label>
          <span class="text-gray-400 text-xs">{{ hillsThreshold }}% - 100%</span>
        </div>
      </div>
    </div>

    <!-- Texture palette -->
    <div v-if="mapData?.textures?.textureNames && viewMode === 'texture'">
      <h3 class="text-lg font-semibold text-white mb-3">Palette Texture</h3>
      <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
        <div
          v-for="(texture, index) in mapData.textures.textureNames.slice(0, 50)"
          :key="index"
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 cursor-pointer truncate"
          :title="texture"
          @click="selectTexture(index)"
          :class="{ 'bg-blue-600': selectedTexture === index }"
        >
          {{ texture.replace(/^[^_]*_/, '') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  mapData: Object,
  viewMode: String,
  currentWaterLevel: Number,
  xmlWaterLevel: Number,
  elevationRange: Object,
  beachThreshold: Number,
  hillsThreshold: Number
})

defineEmits([
  'update:viewMode',
  'update:waterLevel',
  'update:beachThreshold',
  'update:hillsThreshold',
  'resetWaterLevel'
])

const selectedTexture = ref(0)

const roundedWaterLevel = computed(() => 
  Math.round(props.currentWaterLevel * 10) / 10
)

const selectTexture = (index) => {
  selectedTexture.value = index
  console.log('Selected texture:', props.mapData.textures.textureNames[index])
}
</script>
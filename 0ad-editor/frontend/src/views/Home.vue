<template>
  <div class="container mx-auto px-4 py-8">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-white mb-4">
        0 A.D. Map Editor
      </h1>
      <p class="text-gray-300 text-lg">
        Visualizza e modifica le mappe di 0 A.D. con un'interfaccia web moderna
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p class="text-gray-400 mt-4">Caricamento mappe...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
      <p class="text-red-300">{{ error }}</p>
    </div>

    <!-- Maps list -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="map in maps"
        :key="map.name"
        class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
      >
        <div class="p-6">
          <h3 class="text-xl font-semibold text-white mb-2">
            {{ map.name }}
          </h3>
          <div class="flex items-center space-x-4 text-sm text-gray-400 mb-4">
            <span v-if="map.pmp" class="flex items-center">
              <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              PMP
            </span>
            <span v-if="map.xml" class="flex items-center">
              <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              XML
            </span>
          </div>
          <router-link
            :to="{ name: 'Editor', params: { mapName: map.name } }"
            class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Apri Editor
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Upload section -->
    <div class="mt-12 bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 class="text-2xl font-semibold text-white mb-4">
        Carica Nuova Mappa
      </h2>
      <p class="text-gray-400 mb-4">
        Seleziona i file .pmp e .xml della tua mappa personalizzata
      </p>
      <div class="flex items-center space-x-4">
        <input
          type="file"
          accept=".pmp,.xml"
          multiple
          @change="handleFileUpload"
          class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        >
        <button
          @click="uploadFiles"
          :disabled="!selectedFiles.length"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
        >
          Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const loading = ref(false)
const error = ref(null)
const maps = ref([])
const selectedFiles = ref([])

const loadMaps = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await axios.get('/api/maps')
    maps.value = response.data.maps
  } catch (err) {
    error.value = 'Errore nel caricamento delle mappe: ' + err.message
  } finally {
    loading.value = false
  }
}

const handleFileUpload = (event) => {
  selectedFiles.value = Array.from(event.target.files)
}

const uploadFiles = async () => {
  if (selectedFiles.value.length !== 2) {
    alert('Seleziona esattamente 2 file (.pmp e .xml)')
    return
  }
  
  const formData = new FormData()
  selectedFiles.value.forEach(file => {
    const ext = file.name.split('.').pop()
    formData.append(ext, file)
  })
  
  try {
    loading.value = true
    await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    await loadMaps() // Ricarica la lista
    selectedFiles.value = []
  } catch (err) {
    error.value = 'Errore nell\'upload: ' + err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadMaps)
</script>
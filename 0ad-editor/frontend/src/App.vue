<template>
  <div id="app" class="min-h-screen bg-gray-900">
    <nav class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <router-link to="/" class="text-xl font-bold text-white">
              🗺️ 0 A.D. Map Editor
            </router-link>
          </div>
          <div class="flex space-x-4">
            <router-link
              to="/"
              class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              :class="{ 'bg-gray-900 text-white': $route.name === 'Home' }"
            >
              Home
            </router-link>
            <router-link
              to="/editor"
              class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              :class="{ 'bg-gray-900 text-white': $route.name === 'Editor' }"
            >
              Editor
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-1">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// Navigation component
</script>
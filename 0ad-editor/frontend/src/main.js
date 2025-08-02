import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import './style.css'

import MapEditor from './views/MapEditor.vue'
import Home from './views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/editor/:mapName?', name: 'Editor', component: MapEditor, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
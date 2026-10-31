import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import 'element-plus/dist/index.css'
import '@/assets/styles/main.css'

import App from './App.vue'
import router from './router'
import { onUnauthorized } from './services/http'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// Cuando la API responde 401 se limpia la sesión y se vuelve al login.
onUnauthorized(() => {
  const authStore = useAuthStore(pinia)
  authStore.clearSession()

  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login' })
  }
})

app.mount('#app')

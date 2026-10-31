<script setup lang="ts">
/**
 * Layout principal de la aplicación (cabecera + menú lateral + contenido).
 *
 * Responsive: en escritorio el menú lateral es fijo y plegable; en tablet y
 * móvil se convierte en un drawer desplegable.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const route = useRoute()
const collapsed = ref(false)
const drawerOpen = ref(false)
const mobile = ref(false)

const MOBILE_BREAKPOINT = 900

/** En móvil el drawer muestra siempre las etiquetas del menú. */
const sidebarCollapsed = computed(() => !mobile.value && collapsed.value)

function syncViewport(): void {
  mobile.value = window.innerWidth < MOBILE_BREAKPOINT

  if (!mobile.value) {
    drawerOpen.value = false
  }
}

function toggleSidebar(): void {
  if (mobile.value) {
    drawerOpen.value = !drawerOpen.value
    return
  }

  collapsed.value = !collapsed.value
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)
</script>

<template>
  <div class="app-shell">
    <AppHeader :collapsed="collapsed" :mobile="mobile" @toggle-sidebar="toggleSidebar" />

    <div class="app-shell__body">
      <aside
        class="app-shell__aside"
        :class="{
          'app-shell__aside--collapsed': sidebarCollapsed,
          'app-shell__aside--open': drawerOpen,
        }"
      >
        <AppSidebar :collapsed="sidebarCollapsed" />
      </aside>

      <div
        v-if="drawerOpen"
        class="app-shell__overlay"
        aria-hidden="true"
        @click="drawerOpen = false"
      />

      <main class="app-shell__main">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--tf-bg);
}

.app-shell__body {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
}

.app-shell__aside {
  width: 240px;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.app-shell__aside--collapsed {
  width: 72px;
}

.app-shell__main {
  flex: 1;
  min-width: 0;
  padding: 1.25rem;
}

.app-shell__overlay {
  position: fixed;
  inset: 60px 0 0;
  z-index: 900;
  background: rgb(15 23 42 / 45%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .app-shell__aside {
    position: fixed;
    top: 60px;
    bottom: 0;
    left: 0;
    z-index: 1000;
    width: 240px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--tf-shadow);
  }

  .app-shell__aside--collapsed {
    width: 240px;
  }

  .app-shell__aside--open {
    transform: translateX(0);
  }

  .app-shell__main {
    padding: 1rem;
  }
}
</style>

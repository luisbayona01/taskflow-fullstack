<script setup lang="ts">
/**
 * Menú lateral de navegación. En móvil se muestra como drawer desplegable.
 */
import { useRoute } from 'vue-router'
import { DataBoard, FolderOpened } from '@element-plus/icons-vue'
import type { Component } from 'vue'

defineProps<{
  collapsed: boolean
}>()

const route = useRoute()

interface NavItem {
  label: string
  icon: Component
  /** Destino del enlace. */
  to: { name: string }
  /** Nombres de ruta que mantienen activo este enlace. */
  routes: string[]
}

const items: NavItem[] = [
  { label: 'Panel', icon: DataBoard, to: { name: 'dashboard' }, routes: ['dashboard'] },
  {
    label: 'Proyectos',
    icon: FolderOpened,
    to: { name: 'projects' },
    routes: ['projects', 'project-detail', 'task-detail'],
  },
]
</script>

<template>
  <nav class="app-sidebar" aria-label="Navegación principal">
    <ul class="app-sidebar__list">
      <li v-for="item in items" :key="item.label">
        <RouterLink
          class="app-sidebar__link"
          :class="{ 'app-sidebar__link--active': item.routes.includes(String(route.name)) }"
          :to="item.to"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed" class="app-sidebar__label">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.app-sidebar {
  height: 100%;
  padding: 0.75rem 0.5rem;
  background: var(--tf-surface);
  border-right: 1px solid var(--tf-border);
}

.app-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.app-sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--tf-text-muted);
  text-decoration: none;
  font-size: 0.92rem;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.app-sidebar__link:hover {
  background: var(--tf-surface-hover);
  color: var(--tf-text);
}

.app-sidebar__link--active {
  background: var(--tf-primary-soft);
  color: var(--tf-primary);
  font-weight: 600;
}

.app-sidebar__label {
  white-space: nowrap;
}
</style>

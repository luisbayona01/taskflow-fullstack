<script setup lang="ts">
/**
 * Cabecera principal de la aplicación (responsive).
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Expand, Fold, Menu, SwitchButton } from '@element-plus/icons-vue'

import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed: boolean
  mobile: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle-sidebar'): void
}>()

const router = useRouter()
const authStore = useAuthStore()

const toggleIcon = computed(() => {
  if (props.mobile) {
    return Menu
  }

  return props.collapsed ? Expand : Fold
})

const toggleLabel = computed(() => {
  if (props.mobile) {
    return 'Abrir menú'
  }

  return props.collapsed ? 'Expandir menú' : 'Contraer menú'
})

async function handleLogout(): Promise<void> {
  await authStore.logout()
  ElMessage.success('Sesión cerrada correctamente.')
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <el-button
        class="app-header__toggle"
        text
        circle
        :aria-label="toggleLabel"
        @click="emit('toggle-sidebar')"
      >
        <el-icon><component :is="toggleIcon" /></el-icon>
      </el-button>

      <span class="app-header__brand">TaskFlow</span>
    </div>

    <div class="app-header__right">
      <span v-if="authStore.user" class="app-header__user">{{ authStore.user.name }}</span>
      <el-button text circle aria-label="Cerrar sesión" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
      </el-button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: 60px;
  padding: 0 1rem;
  background: var(--tf-surface);
  border-bottom: 1px solid var(--tf-border);
}

.app-header__left,
.app-header__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-header__brand {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--tf-primary);
}

.app-header__user {
  font-size: 0.9rem;
  color: var(--tf-text-muted);
}

@media (max-width: 640px) {
  .app-header__user {
    display: none;
  }
}
</style>

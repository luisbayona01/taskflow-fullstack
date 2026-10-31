<script setup lang="ts">
/**
 * Placeholder de la vista 404.
 */
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="not-found">
    <p class="not-found__code">404</p>
    <h1 class="not-found__title">Página no encontrada</h1>
    <p class="not-found__text">La ruta solicitada no existe en TaskFlow.</p>
    <el-button type="primary" @click="router.push({ name: 'dashboard' })"
      >Volver al panel</el-button
    >
  </section>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 60vh;
  text-align: center;
}

.not-found__code {
  margin: 0;
  font-size: 3rem;
  font-weight: 800;
  color: var(--tf-primary);
}

.not-found__title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.not-found__text {
  margin: 0 0 1rem;
  color: var(--tf-text-muted);
}
</style>

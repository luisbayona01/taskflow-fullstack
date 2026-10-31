<script setup lang="ts">
/**
 * Placeholder del panel. La implementación completa (resumen de proyectos,
 * actividad reciente) llega en la siguiente iteración.
 */
</script>

<template>
  <section class="placeholder">
    <h1 class="placeholder__title">Panel</h1>
    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="Módulo en construcción"
      description="Aquí se mostrarán las tarjetas de estadísticas globales, los proyectos recientes y la actividad del equipo."
    />
  </section>
</template>

<style scoped>
.placeholder__title {
  margin: 0 0 1rem;
  font-size: 1.4rem;
  font-weight: 700;
}
</style>

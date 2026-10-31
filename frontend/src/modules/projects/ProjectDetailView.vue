<script setup lang="ts">
/**
 * Placeholder del detalle de proyecto.
 * La version completa incluira las tarjetas de estadisticas, los filtros de tareas,
 * la busqueda con debounce, el ordenamiento, la paginacion y el Kanban.
 */
</script>

<template>
  <section class="placeholder">
    <h1 class="placeholder__title">Detalle del proyecto</h1>
    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="Módulo en construcción"
      description="Se implementarán las estadísticas (endpoint /stats), el listado filtrado de tareas y la vista Kanban."
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

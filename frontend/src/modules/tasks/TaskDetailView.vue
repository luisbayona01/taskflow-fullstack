<script setup lang="ts">
/**
 * Placeholder del detalle de tarea.
 * La version completa incluira la edicion de la tarea y la seccion de comentarios.
 */
</script>

<template>
  <section class="placeholder">
    <h1 class="placeholder__title">Detalle de la tarea</h1>
    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="Módulo en construcción"
      description="Se implementarán la edición de la tarea, el cambio de estado y los comentarios."
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

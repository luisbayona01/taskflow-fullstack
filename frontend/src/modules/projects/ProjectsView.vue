<script setup lang="ts">
/**
 * Placeholder del listado de proyectos.
 * La version completa traera el listado, el alta de proyectos y sus estados
 * de carga / vacio / error.
 */
</script>

<template>
  <section class="placeholder">
    <header class="placeholder__header">
      <h1 class="placeholder__title">Proyectos</h1>
      <el-button type="primary" disabled>Nuevo proyecto</el-button>
    </header>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="Módulo en construcción"
      description="Se implementarán el listado de proyectos, el alta con modal y los estados de carga, vacío y error."
    />
  </section>
</template>

<style scoped>
.placeholder__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.placeholder__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}
</style>

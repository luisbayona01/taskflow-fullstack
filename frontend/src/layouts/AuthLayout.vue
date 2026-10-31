<script setup lang="ts">
/**
 * Layout para las pantallas públicas (login y registro).
 */
</script>

<template>
  <div class="auth-layout">
    <div class="auth-layout__card">
      <div class="auth-layout__brand">
        <span class="auth-layout__logo">TaskFlow</span>
        <p class="auth-layout__tagline">Gestión de proyectos y tareas para equipos pequeños.</p>
      </div>

      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #ecfeff 100%);
}

.auth-layout__card {
  width: min(420px, 100%);
  padding: 2rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 1rem;
  box-shadow: var(--tf-shadow);
}

.auth-layout__brand {
  margin-bottom: 1.5rem;
  text-align: center;
}

.auth-layout__logo {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--tf-primary);
}

.auth-layout__tagline {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
}

@media (max-width: 480px) {
  .auth-layout__card {
    padding: 1.25rem;
    border-radius: 0.75rem;
  }
}
</style>

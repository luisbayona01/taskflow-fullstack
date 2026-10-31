<script setup lang="ts">
/**
 * Panel de control.
 *
 * El backend no expone un endpoint agregado: el servicio `dashboardService`
 * compone endpoints reales (`/projects` y `/projects/{id}/stats`) y devuelve
 * los totales ya calculados.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Collection, FolderOpened, Refresh, Warning } from '@element-plus/icons-vue'

import { dashboardService } from '@/services/dashboard'
import { describeApiError } from '@/utils/api-error'
import { formatDate } from '@/utils/format'
import type { DashboardOverview } from '@/services/dashboard'

const router = useRouter()

const overview = ref<DashboardOverview | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const totals = computed(() => overview.value?.totals ?? null)
const projects = computed(() => overview.value?.projects ?? [])

async function loadOverview(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    overview.value = await dashboardService.overview()
  } catch (unknown) {
    overview.value = null
    error.value = describeApiError(unknown).message
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)

function openProject(projectId: number): void {
  void router.push({ name: 'project-detail', params: { projectId } })
}
</script>

<template>
  <section class="dashboard">
    <header class="dashboard__header">
      <div>
        <h1 class="dashboard__title">Panel</h1>
        <p class="dashboard__subtitle">Resumen de tus proyectos y tareas.</p>
      </div>

      <el-button :loading="loading" @click="loadOverview">
        <el-icon><Refresh /></el-icon>
        Actualizar
      </el-button>
    </header>

    <el-alert
      v-if="error"
      type="error"
      show-icon
      :closable="false"
      :title="error"
    >
      <template #default>
        <el-button size="small" @click="loadOverview">Reintentar</el-button>
      </template>
    </el-alert>

    <div v-if="loading" class="dashboard__loading" aria-live="polite">
      <el-skeleton :rows="4" animated />
    </div>

    <template v-else-if="totals">
      <div class="dashboard__stats">
        <el-card shadow="never" class="dashboard__stat">
          <span class="dashboard__stat-label">Proyectos</span>
          <strong class="dashboard__stat-value">{{ totals.projects }}</strong>
          <el-icon class="dashboard__stat-icon"><FolderOpened /></el-icon>
        </el-card>

        <el-card shadow="never" class="dashboard__stat">
          <span class="dashboard__stat-label">Tareas</span>
          <strong class="dashboard__stat-value">{{ totals.tasks }}</strong>
          <el-icon class="dashboard__stat-icon"><Collection /></el-icon>
        </el-card>

        <el-card shadow="never" class="dashboard__stat">
          <span class="dashboard__stat-label">Completadas</span>
          <strong class="dashboard__stat-value">{{ totals.done }}</strong>
        </el-card>

        <el-card shadow="never" class="dashboard__stat">
          <span class="dashboard__stat-label">En curso</span>
          <strong class="dashboard__stat-value">{{ totals.in_progress }}</strong>
        </el-card>

        <el-card shadow="never" class="dashboard__stat">
          <span class="dashboard__stat-label">Vencidas</span>
          <strong class="dashboard__stat-value">{{ totals.overdue }}</strong>
          <el-icon class="dashboard__stat-icon dashboard__stat-icon--warning">
            <Warning />
          </el-icon>
        </el-card>
      </div>

      <el-card shadow="never">
        <div class="dashboard__progress-header">
          <h2 class="dashboard__section-title">Progreso global</h2>
          <span>{{ totals.progress_percentage }}%</span>
        </div>
        <el-progress
          :percentage="totals.progress_percentage"
          :stroke-width="12"
          :show-text="false"
        />
      </el-card>

      <el-card shadow="never">
        <h2 class="dashboard__section-title">Proyectos recientes</h2>

        <el-empty
          v-if="projects.length === 0"
          description="Todavía no tienes proyectos."
          :image-size="80"
        />

        <ul v-else class="dashboard__projects">
          <li v-for="project in projects" :key="project.id">
            <button type="button" class="dashboard__project" @click="openProject(project.id)">
              <span class="dashboard__project-name">{{ project.name }}</span>
              <span class="dashboard__project-meta">
                {{ project.owner?.name ?? '—' }} · {{ formatDate(project.created_at) }}
              </span>
            </button>
          </li>
        </ul>
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.dashboard__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
}

.dashboard__loading {
  padding: 1rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.dashboard__stat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dashboard__stat-label {
  font-size: 0.8rem;
  color: var(--tf-text-muted);
}

.dashboard__stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}

.dashboard__stat-icon {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  color: var(--tf-primary);
  opacity: 0.6;
}

.dashboard__stat-icon--warning {
  color: var(--el-color-danger);
}

.dashboard__progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.dashboard__section-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.dashboard__projects {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dashboard__project {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
  padding: 0.5rem 0.25rem;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-bottom: 1px solid var(--tf-border);
}

.dashboard__project:hover .dashboard__project-name {
  color: var(--tf-primary);
}

.dashboard__project-name {
  font-weight: 600;
}

.dashboard__project-meta {
  font-size: 0.8rem;
  color: var(--tf-text-muted);
}
</style>

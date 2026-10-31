<script setup lang="ts">
/**
 * Detalle de un proyecto.
 *
 * Muestra la información general, el propietario, los miembros, las tareas y
 * los indicadores de progreso. Las acciones de administración (editar y
 * eliminar) solo se ofrecen al propietario: el backend sigue siendo la
 * autoridad de la autorización y responde 403/404 cuando corresponde.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Collection, Delete, Edit, Refresh } from '@element-plus/icons-vue'

import ProjectForm from '@/components/projects/ProjectForm.vue'
import ProjectMembers from '@/components/projects/ProjectMembers.vue'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/api-error'
import { formatDate } from '@/utils/format'
import { PROJECT_ROLE_LABELS } from '@/utils/project-role'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TAG_TYPES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TAG_TYPES,
} from '@/utils/task-labels'
import type { ProjectPayload, Task } from '@/types/api'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const editDialogVisible = ref(false)
const editFieldErrors = ref<Record<string, string[]>>({})

const projectId = computed(() => Number(route.params.projectId))
const project = computed(() => projectStore.current)
const role = computed(() => (project.value ? projectStore.roleFor(project.value) : 'member'))
const isOwner = computed(() => role.value === 'owner')

const stats = computed(() => projectStore.currentStats)

async function loadProject(): Promise<void> {
  if (!Number.isFinite(projectId.value)) {
    return
  }

  await projectStore.fetchProject(projectId.value)
}

onMounted(loadProject)

watch(projectId, loadProject)

function goBack(): void {
  void router.push({ name: 'projects' })
}

function goToTasks(): void {
  void router.push({ name: 'task-list', params: { projectId: projectId.value } })
}

function openEditDialog(): void {
  editFieldErrors.value = {}
  editDialogVisible.value = true
}

async function handleUpdate(payload: ProjectPayload): Promise<void> {
  if (!project.value) {
    return
  }

  editFieldErrors.value = {}

  try {
    await projectStore.updateProject(project.value.id, payload)
    editDialogVisible.value = false
    ElMessage.success('Proyecto actualizado correctamente.')
  } catch (unknown) {
    const description = describeApiError(unknown)
    editFieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

async function handleDelete(): Promise<void> {
  if (!project.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `¿Seguro que quieres eliminar el proyecto "${project.value.name}"? Esta acción no se puede deshacer.`,
      'Eliminar proyecto',
      {
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  try {
    await projectStore.deleteProject(project.value.id)
    ElMessage.success('Proyecto eliminado correctamente.')
    await router.push({ name: 'projects' })
  } catch (unknown) {
    ElMessage.error(describeApiError(unknown).message)
  }
}
</script>

<template>
  <section class="project-detail">
    <div class="project-detail__back">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        Volver a proyectos
      </el-button>
    </div>

    <div v-if="projectStore.detailLoading" class="project-detail__loading" aria-live="polite">
      <el-skeleton :rows="6" animated />
    </div>

    <el-result
      v-else-if="projectStore.detailError"
      icon="error"
      :title="projectStore.detailError"
      sub-title="No se ha podido cargar el detalle del proyecto."
    >
      <template #extra>
        <el-button type="primary" @click="loadProject">
          <el-icon><Refresh /></el-icon>
          Reintentar
        </el-button>
        <el-button @click="goBack">Volver al listado</el-button>
      </template>
    </el-result>

    <template v-else-if="project">
      <header class="project-detail__header">
        <div class="project-detail__heading">
          <h1 class="project-detail__title">{{ project.name }}</h1>
          <div class="project-detail__tags">
            <el-tag :type="isOwner ? 'primary' : 'info'" size="small" effect="light">
              {{ PROJECT_ROLE_LABELS[role] }}
            </el-tag>
            <span class="project-detail__id">#{{ project.id }}</span>
          </div>
        </div>

        <div v-if="isOwner" class="project-detail__actions">
          <el-button @click="openEditDialog">
            <el-icon><Edit /></el-icon>
            Editar
          </el-button>
          <el-button type="danger" plain :loading="projectStore.deleting" @click="handleDelete">
            <el-icon><Delete /></el-icon>
            Eliminar
          </el-button>
        </div>

        <div class="project-detail__actions">
          <el-button type="primary" plain @click="goToTasks">
            <el-icon><Collection /></el-icon>
            Ver tareas
          </el-button>
        </div>
      </header>

      <p class="project-detail__description">
        {{ project.description?.trim() || 'Sin descripción.' }}
      </p>

      <div class="project-detail__stats">
        <el-card shadow="never" class="project-detail__stat">
          <span class="project-detail__stat-label">Tareas totales</span>
          <strong class="project-detail__stat-value">{{ stats?.total_tasks ?? '—' }}</strong>
        </el-card>

        <el-card shadow="never" class="project-detail__stat">
          <span class="project-detail__stat-label">Pendientes</span>
          <strong class="project-detail__stat-value">{{ stats?.pending ?? '—' }}</strong>
        </el-card>

        <el-card shadow="never" class="project-detail__stat">
          <span class="project-detail__stat-label">En curso</span>
          <strong class="project-detail__stat-value">{{ stats?.in_progress ?? '—' }}</strong>
        </el-card>

        <el-card shadow="never" class="project-detail__stat">
          <span class="project-detail__stat-label">Completadas</span>
          <strong class="project-detail__stat-value">{{ stats?.done ?? '—' }}</strong>
        </el-card>

        <el-card shadow="never" class="project-detail__stat">
          <span class="project-detail__stat-label">Vencidas</span>
          <strong class="project-detail__stat-value">{{ stats?.overdue ?? '—' }}</strong>
        </el-card>
      </div>

      <el-card shadow="never" class="project-detail__progress">
        <div class="project-detail__progress-header">
          <h2 class="project-detail__section-title">Progreso</h2>
          <span>{{ stats ? `${stats.progress_percentage}%` : '—' }}</span>
        </div>
        <el-progress
          :percentage="stats?.progress_percentage ?? 0"
          :stroke-width="12"
          :show-text="false"
        />
      </el-card>

      <div class="project-detail__columns">
        <el-card shadow="never">
          <h2 class="project-detail__section-title">Información general</h2>
          <dl class="project-detail__info">
            <div>
              <dt>Propietario</dt>
              <dd>{{ project.owner?.name ?? '—' }}</dd>
            </div>
            <div>
              <dt>Correo del propietario</dt>
              <dd>{{ project.owner?.email ?? '—' }}</dd>
            </div>
            <div>
              <dt>Creado</dt>
              <dd>{{ formatDate(project.created_at) }}</dd>
            </div>
            <div>
              <dt>Actualizado</dt>
              <dd>{{ formatDate(project.updated_at) }}</dd>
            </div>
          </dl>
        </el-card>

        <el-card shadow="never">
          <ProjectMembers
            :project-id="project.id"
            :project-owner-id="project.owner_id"
            :can-manage="isOwner"
            :current-user-id="authStore.user?.id ?? null"
          />
        </el-card>
      </div>

      <el-card shadow="never">
        <h2 class="project-detail__section-title">
          Tareas ({{ projectStore.currentTasks.length }})
        </h2>

        <div v-if="projectStore.tasksLoading" aria-live="polite">
          <el-skeleton :rows="3" animated />
        </div>

        <el-empty
          v-else-if="projectStore.currentTasks.length === 0"
          description="Todavía no hay tareas en este proyecto."
          :image-size="80"
        />

        <el-table v-else :data="projectStore.currentTasks" row-key="id">
          <el-table-column prop="title" label="Tarea" min-width="200" />
          <el-table-column label="Estado" width="130">
            <template #default="{ row }: { row: Task }">
              <el-tag
                v-if="row.status"
                :type="TASK_STATUS_TAG_TYPES[row.status]"
                size="small"
                effect="light"
              >
                {{ TASK_STATUS_LABELS[row.status] }}
              </el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="Prioridad" width="120">
            <template #default="{ row }: { row: Task }">
              <el-tag
                v-if="row.priority"
                :type="TASK_PRIORITY_TAG_TYPES[row.priority]"
                size="small"
                effect="plain"
              >
                {{ TASK_PRIORITY_LABELS[row.priority] }}
              </el-tag>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="Vencimiento" width="140">
            <template #default="{ row }: { row: Task }">{{ formatDate(row.due_date) }}</template>
          </el-table-column>
          <el-table-column label="Asignada a" min-width="160">
            <template #default="{ row }: { row: Task }">
              {{ row.assigned_user?.name ?? '—' }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-dialog
      v-model="editDialogVisible"
      title="Editar proyecto"
      width="min(520px, 92vw)"
      destroy-on-close
    >
      <ProjectForm
        :project="project"
        :loading="projectStore.saving"
        :field-errors="editFieldErrors"
        @submit="handleUpdate"
        @cancel="editDialogVisible = false"
      />
    </el-dialog>
  </section>
</template>

<style scoped>
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-detail__back {
  margin-bottom: -0.5rem;
}

.project-detail__loading {
  padding: 1rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.project-detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.project-detail__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  word-break: break-word;
}

.project-detail__tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.project-detail__id {
  font-size: 0.85rem;
  color: var(--tf-text-muted);
}

.project-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-detail__description {
  margin: 0;
  color: var(--tf-text-muted);
}

.project-detail__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.project-detail__stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.project-detail__stat-label {
  font-size: 0.8rem;
  color: var(--tf-text-muted);
}

.project-detail__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.project-detail__progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.project-detail__section-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.project-detail__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.project-detail__info {
  display: grid;
  gap: 0.6rem;
  margin: 0;
}

.project-detail__info dt {
  margin: 0;
  font-size: 0.78rem;
  color: var(--tf-text-muted);
}

.project-detail__info dd {
  margin: 0;
  font-weight: 600;
}
</style>

<script setup lang="ts">
/**
 * Listado de tareas de un proyecto.
 *
 * Aplica los filtros reales del backend (búsqueda, estado, prioridad,
 * asignado, fechas, orden y tamaño de página) sobre
 * `GET /api/projects/{project}/tasks`.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'

import TaskFilters from '@/components/tasks/TaskFilters.vue'
import TaskForm from '@/components/tasks/TaskForm.vue'
import { useTaskStore } from '@/stores/task'
import { useMemberStore } from '@/stores/member'
import { useProjectStore } from '@/stores/project'
import { describeApiError } from '@/utils/api-error'
import { formatDate } from '@/utils/format'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TAG_TYPES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TAG_TYPES,
} from '@/utils/task-labels'
import type { Task, TaskFilters as TaskFilterValues, TaskPayload } from '@/types/api'

const route = useRoute()
const router = useRouter()

const taskStore = useTaskStore()
const memberStore = useMemberStore()
const projectStore = useProjectStore()

const filters = ref<TaskFilterValues>({})
const dialogVisible = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})

const projectId = computed(() => Number(route.params.projectId))
const projectName = computed(() => projectStore.current?.name ?? 'Proyecto')
const currentPage = computed(() => taskStore.pagination?.current_page ?? 1)
const lastPage = computed(() => taskStore.pagination?.last_page ?? 1)

async function loadTasks(overrides?: TaskFilterValues): Promise<void> {
  await taskStore.fetchTasks(projectId.value, overrides)
}

async function loadMembers(): Promise<void> {
  await memberStore.fetchMembers(projectId.value)
}

onMounted(async () => {
  await Promise.all([
    loadTasks(),
    loadMembers(),
    projectStore.fetchProject(projectId.value),
  ])
})

watch(projectId, () => {
  void loadTasks()
  void loadMembers()
})

function goBack(): void {
  void router.push({ name: 'project-detail', params: { projectId: projectId.value } })
}

function openTask(task: Task): void {
  void router.push({
    name: 'task-detail',
    params: { projectId: projectId.value, taskId: task.id },
  })
}

async function applyFilters(value: TaskFilterValues): Promise<void> {
  await loadTasks({ ...value, page: 1 })
}

async function changePage(page: number): Promise<void> {
  await loadTasks({ ...filters.value, page })
}

async function handleCreate(payload: TaskPayload): Promise<void> {
  fieldErrors.value = {}

  try {
    const task = await taskStore.createTask(projectId.value, payload)
    dialogVisible.value = false
    ElMessage.success('Tarea creada correctamente.')
    await loadTasks()
    openTask(task)
  } catch (unknown) {
    const description = describeApiError(unknown)
    fieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

async function handleRemove(task: Task): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `¿Seguro que quieres eliminar la tarea "${task.title}"?`,
      'Eliminar tarea',
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
    await taskStore.removeTask(projectId.value, task.id)
    ElMessage.success('Tarea eliminada correctamente.')
  } catch (unknown) {
    ElMessage.error(describeApiError(unknown).message)
  }
}
</script>

<template>
  <section class="task-list">
    <div class="task-list__back">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        Volver al proyecto
      </el-button>
    </div>

    <header class="task-list__header">
      <div>
        <h1 class="task-list__title">Tareas de {{ projectName }}</h1>
        <p class="task-list__subtitle">
          {{ taskStore.pagination?.total ?? taskStore.tasks.length }} tarea(s) en total.
        </p>
      </div>

      <el-button type="primary" @click="dialogVisible = true">
        <el-icon><Plus /></el-icon>
        Nueva tarea
      </el-button>
    </header>

    <TaskFilters
      v-model="filters"
      :members="memberStore.members"
      :loading="taskStore.loading"
      @apply="applyFilters"
    />

    <el-alert
      v-if="taskStore.error"
      type="error"
      show-icon
      :closable="false"
      :title="taskStore.error"
    />

    <div v-if="taskStore.loading" class="task-list__loading" aria-live="polite">
      <el-skeleton :rows="4" animated />
    </div>

    <el-empty
      v-else-if="taskStore.tasks.length === 0"
      description="No hay tareas que coincidan con los filtros aplicados."
      :image-size="90"
    >
      <el-button type="primary" @click="dialogVisible = true">Crear la primera tarea</el-button>
    </el-empty>

    <template v-else>
      <el-card shadow="never" class="task-list__card">
        <el-table :data="taskStore.tasks" row-key="id">
          <el-table-column prop="title" label="Tarea" min-width="200">
            <template #default="{ row }: { row: Task }">
              <el-button text type="primary" @click="openTask(row)">{{ row.title }}</el-button>
            </template>
          </el-table-column>

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

          <el-table-column label="Asignada a" min-width="150">
            <template #default="{ row }: { row: Task }">
              {{ row.assigned_user?.name ?? '—' }}
            </template>
          </el-table-column>

          <el-table-column label="Acciones" width="130" align="right">
            <template #default="{ row }: { row: Task }">
              <el-button text type="primary" @click="openTask(row)">Ver</el-button>
              <el-button text type="danger" @click="handleRemove(row)">Eliminar</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-pagination
        v-if="lastPage > 1"
        class="task-list__pagination"
        layout="prev, pager, next"
        :current-page="currentPage"
        :total="taskStore.pagination?.total ?? 0"
        :page-size="taskStore.pagination?.per_page ?? 15"
        @current-change="changePage"
      />
    </template>

    <el-dialog
      v-model="dialogVisible"
      title="Nueva tarea"
      width="min(620px, 94vw)"
      destroy-on-close
    >
      <TaskForm
        :members="memberStore.members"
        :loading="taskStore.saving"
        :field-errors="fieldErrors"
        @submit="handleCreate"
        @cancel="dialogVisible = false"
      />
    </el-dialog>
  </section>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-list__back {
  margin-bottom: -0.5rem;
}

.task-list__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.task-list__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.task-list__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
}

.task-list__loading {
  padding: 1rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.task-list__card {
  overflow: hidden;
}

.task-list__pagination {
  justify-content: center;
}
</style>

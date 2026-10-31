<script setup lang="ts">
/**
 * Detalle de una tarea.
 *
 * Muestra la información de la tarea (endpoint
 * `GET /api/projects/{project}/tasks/{task}`) y su sección de comentarios.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

import TaskComments from '@/components/tasks/TaskComments.vue'
import { taskService } from '@/services/task'
import { describeApiError } from '@/utils/api-error'
import { formatDate } from '@/utils/format'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TAG_TYPES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TAG_TYPES,
} from '@/utils/task-labels'
import type { Task, TaskStatus } from '@/types/api'

const route = useRoute()
const router = useRouter()

const task = ref<Task | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const updating = ref(false)

const projectId = computed(() => Number(route.params.projectId))
const taskId = computed(() => Number(route.params.taskId))

async function loadTask(): Promise<void> {
  if (!Number.isFinite(projectId.value) || !Number.isFinite(taskId.value)) {
    return
  }

  loading.value = true
  error.value = null

  try {
    task.value = await taskService.get(projectId.value, taskId.value)
  } catch (unknown) {
    task.value = null
    error.value = describeApiError(unknown).message
  } finally {
    loading.value = false
  }
}

onMounted(loadTask)

watch([projectId, taskId], loadTask)

function goBack(): void {
  void router.push({ name: 'project-detail', params: { projectId: projectId.value } })
}

async function handleStatusChange(status: TaskStatus): Promise<void> {
  if (!task.value) {
    return
  }

  updating.value = true

  try {
    task.value = await taskService.updateStatus(projectId.value, taskId.value, status)
    ElMessage.success('Estado de la tarea actualizado.')
  } catch (unknown) {
    ElMessage.error(describeApiError(unknown).message)
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <section class="task-detail">
    <div class="task-detail__back">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        Volver al proyecto
      </el-button>
    </div>

    <div v-if="loading" class="task-detail__loading" aria-live="polite">
      <el-skeleton :rows="5" animated />
    </div>

    <el-result
      v-else-if="error"
      icon="error"
      :title="error"
      sub-title="No se ha podido cargar la tarea."
    >
      <template #extra>
        <el-button type="primary" @click="loadTask">Reintentar</el-button>
        <el-button @click="goBack">Volver al proyecto</el-button>
      </template>
    </el-result>

    <template v-else-if="task">
      <header class="task-detail__header">
        <div>
          <h1 class="task-detail__title">{{ task.title }}</h1>
          <p class="task-detail__description">
            {{ task.description?.trim() || 'Sin descripción.' }}
          </p>
        </div>

        <div class="task-detail__tags">
          <el-tag v-if="task.status" :type="TASK_STATUS_TAG_TYPES[task.status]" effect="light">
            {{ TASK_STATUS_LABELS[task.status] }}
          </el-tag>
          <el-tag
            v-if="task.priority"
            :type="TASK_PRIORITY_TAG_TYPES[task.priority]"
            effect="plain"
          >
            {{ TASK_PRIORITY_LABELS[task.priority] }}
          </el-tag>
        </div>
      </header>

      <div class="task-detail__columns">
        <el-card shadow="never">
          <h2 class="task-detail__section-title">Detalles</h2>
          <dl class="task-detail__info">
            <div>
              <dt>Proyecto</dt>
              <dd>#{{ task.project_id }}</dd>
            </div>
            <div>
              <dt>Vencimiento</dt>
              <dd>{{ formatDate(task.due_date) }}</dd>
            </div>
            <div>
              <dt>Asignada a</dt>
              <dd>{{ task.assigned_user?.name ?? 'Sin asignar' }}</dd>
            </div>
            <div>
              <dt>Creada</dt>
              <dd>{{ formatDate(task.created_at) }}</dd>
            </div>
          </dl>
        </el-card>

        <el-card shadow="never">
          <h2 class="task-detail__section-title">Cambiar estado</h2>
          <el-select
            :model-value="task.status ?? undefined"
            placeholder="Selecciona un estado"
            :loading="updating"
            :disabled="updating"
            class="task-detail__status"
            @update:model-value="handleStatusChange"
          >
            <el-option
              v-for="(label, status) in TASK_STATUS_LABELS"
              :key="status"
              :label="label"
              :value="status"
            />
          </el-select>
        </el-card>
      </div>

      <el-card shadow="never">
        <TaskComments :project-id="projectId" :task-id="taskId" />
      </el-card>
    </template>
  </section>
</template>

<style scoped>
.task-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-detail__back {
  margin-bottom: -0.5rem;
}

.task-detail__loading {
  padding: 1rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.task-detail__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.task-detail__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  word-break: break-word;
}

.task-detail__description {
  margin: 0.25rem 0 0;
  color: var(--tf-text-muted);
}

.task-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.task-detail__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.task-detail__section-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.task-detail__info {
  display: grid;
  gap: 0.6rem;
  margin: 0;
}

.task-detail__info dt {
  margin: 0;
  font-size: 0.78rem;
  color: var(--tf-text-muted);
}

.task-detail__info dd {
  margin: 0;
  font-weight: 600;
}

.task-detail__status {
  width: 100%;
}
</style>

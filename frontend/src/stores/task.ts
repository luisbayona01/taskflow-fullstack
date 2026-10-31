/**
 * Store de tareas (Pinia).
 *
 * Consume `GET /api/projects/{project}/tasks`, que admite filtros, orden y
 * paginación en el servidor, y `POST/PATCH/DELETE` sobre las tareas del
 * proyecto.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

import { taskService } from '@/services/task'
import { describeApiError } from '@/utils/api-error'
import type { Task, TaskFilters, TaskPayload, TaskPagination, TaskStatus } from '@/types/api'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const pagination = ref<TaskPagination | null>(null)
  const filters = ref<TaskFilters>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchTasks(projectId: number, overrides?: TaskFilters): Promise<void> {
    loading.value = true
    error.value = null

    if (overrides) {
      filters.value = { ...overrides }
    }

    try {
      const result = await taskService.list(projectId, filters.value)
      tasks.value = result.tasks
      pagination.value = result.pagination
    } catch (unknown) {
      tasks.value = []
      pagination.value = null
      error.value = describeApiError(unknown).message
    } finally {
      loading.value = false
    }
  }

  async function createTask(projectId: number, payload: TaskPayload): Promise<Task> {
    saving.value = true

    try {
      return await taskService.create(projectId, payload)
    } finally {
      saving.value = false
    }
  }

  async function updateStatus(
    projectId: number,
    taskId: number,
    status: TaskStatus,
  ): Promise<Task> {
    saving.value = true

    try {
      const updated = await taskService.updateStatus(projectId, taskId, status)

      tasks.value = tasks.value.map((task) => (task.id === updated.id ? updated : task))

      return updated
    } finally {
      saving.value = false
    }
  }

  async function removeTask(projectId: number, taskId: number): Promise<void> {
    saving.value = true

    try {
      await taskService.remove(projectId, taskId)
      tasks.value = tasks.value.filter((task) => task.id !== taskId)
    } finally {
      saving.value = false
    }
  }

  function reset(): void {
    tasks.value = []
    pagination.value = null
    filters.value = {}
    error.value = null
  }

  return {
    tasks,
    pagination,
    filters,
    loading,
    saving,
    error,
    fetchTasks,
    createTask,
    updateStatus,
    removeTask,
    reset,
  }
})

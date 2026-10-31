/**
 * Servicio de tareas.
 *
 * Rutas verificadas en `backend/routes/api.php`:
 * - GET    /api/projects/{project}/tasks           (filtros y paginación)
 * - POST   /api/projects/{project}/tasks
 * - GET    /api/projects/{project}/tasks/{task}
 * - PUT    /api/projects/{project}/tasks/{task}   (PATCH también disponible)
 * - DELETE /api/projects/{project}/tasks/{task}
 */

import { apiClient } from './api'
import type {
  Task,
  TaskFilters,
  TaskPayload,
  TaskResponse,
  TasksResponse,
} from '@/types/api'

export interface TaskService {
  list(projectId: number, filters?: TaskFilters): Promise<TasksResponse['data']>
  get(projectId: number, taskId: number): Promise<Task>
  create(projectId: number, payload: TaskPayload): Promise<Task>
  update(projectId: number, taskId: number, payload: Partial<TaskPayload>): Promise<Task>
  updateStatus(projectId: number, taskId: number, status: TaskPayload['status']): Promise<Task>
  remove(projectId: number, taskId: number): Promise<void>
}

export const taskService: TaskService = {
  async list(projectId: number, filters: TaskFilters = {}): Promise<TasksResponse['data']> {
    const { data } = await apiClient.get<TasksResponse>(`/projects/${projectId}/tasks`, {
      params: filters,
    })
    return data.data
  },

  async get(projectId: number, taskId: number): Promise<Task> {
    const { data } = await apiClient.get<TaskResponse>(`/projects/${projectId}/tasks/${taskId}`)
    return data.data.task
  },

  async create(projectId: number, payload: TaskPayload): Promise<Task> {
    const { data } = await apiClient.post<TaskResponse>(`/projects/${projectId}/tasks`, payload)
    return data.data.task
  },

  async update(
    projectId: number,
    taskId: number,
    payload: Partial<TaskPayload>,
  ): Promise<Task> {
    const { data } = await apiClient.put<TaskResponse>(
      `/projects/${projectId}/tasks/${taskId}`,
      payload,
    )
    return data.data.task
  },

  async updateStatus(
    projectId: number,
    taskId: number,
    status: TaskPayload['status'],
  ): Promise<Task> {
    const { data } = await apiClient.patch<TaskResponse>(
      `/projects/${projectId}/tasks/${taskId}`,
      { status },
    )
    return data.data.task
  },

  async remove(projectId: number, taskId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`)
  },
}

/**
 * Servicios de tareas y comentarios.
 */

import { http } from './http'
import type {
  Comment,
  CommentResponse,
  CommentsResponse,
  Task,
  TaskFilters,
  TaskPayload,
  TaskResponse,
  TasksResponse,
} from '@/types/api'

export const tasksService = {
  async list(projectId: number, filters: TaskFilters = {}): Promise<TasksResponse['data']> {
    const { data } = await http.get<TasksResponse>(`/projects/${projectId}/tasks`, {
      params: filters,
    })
    return data.data
  },

  async create(projectId: number, payload: TaskPayload): Promise<Task> {
    const { data } = await http.post<TaskResponse>(`/projects/${projectId}/tasks`, payload)
    return data.data.task
  },

  async show(projectId: number, taskId: number): Promise<Task> {
    const { data } = await http.get<TaskResponse>(`/projects/${projectId}/tasks/${taskId}`)
    return data.data.task
  },

  async update(projectId: number, taskId: number, payload: Partial<TaskPayload>): Promise<Task> {
    const { data } = await http.put<TaskResponse>(`/projects/${projectId}/tasks/${taskId}`, payload)
    return data.data.task
  },

  async updateStatus(
    projectId: number,
    taskId: number,
    status: TaskPayload['status'],
  ): Promise<Task> {
    const { data } = await http.patch<TaskResponse>(`/projects/${projectId}/tasks/${taskId}`, {
      status,
    })
    return data.data.task
  },

  async remove(projectId: number, taskId: number): Promise<void> {
    await http.delete(`/projects/${projectId}/tasks/${taskId}`)
  },
}

export const commentsService = {
  async list(projectId: number, taskId: number): Promise<CommentsResponse> {
    const { data } = await http.get<CommentsResponse>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
    )
    return data
  },

  async create(projectId: number, taskId: number, body: string): Promise<Comment> {
    const { data } = await http.post<CommentResponse>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      { body },
    )
    return data.data
  },
}

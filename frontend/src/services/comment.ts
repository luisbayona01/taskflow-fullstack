/**
 * Servicio de comentarios de una tarea.
 *
 * Rutas verificadas en `backend/routes/api.php`:
 * - GET  /api/projects/{project}/tasks/{task}/comments  (paginada)
 * - POST /api/projects/{project}/tasks/{task}/comments
 */

import { apiClient } from './api'
import type { Comment, CommentResponse, CommentsResponse } from '@/types/api'

export interface CommentFilters {
  page?: number
  per_page?: number
}

export interface CommentService {
  list(projectId: number, taskId: number, filters?: CommentFilters): Promise<CommentsResponse>
  create(projectId: number, taskId: number, body: string): Promise<Comment>
}

export const commentService: CommentService = {
  async list(
    projectId: number,
    taskId: number,
    filters: CommentFilters = {},
  ): Promise<CommentsResponse> {
    const { data } = await apiClient.get<CommentsResponse>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      { params: filters },
    )
    return data
  },

  async create(projectId: number, taskId: number, body: string): Promise<Comment> {
    const { data } = await apiClient.post<CommentResponse>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      { body },
    )
    return data.data
  },
}

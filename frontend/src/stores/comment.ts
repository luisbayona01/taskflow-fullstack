/**
 * Store de comentarios de una tarea (Pinia).
 *
 * El backend devuelve los comentarios ordenados del más reciente al más
 * antiguo (`latest()`) y el autor siempre procede de la autenticación, nunca
 * del cuerpo de la petición.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

import { commentService } from '@/services/comment'
import { describeApiError } from '@/utils/api-error'
import type { Comment, PaginationMeta } from '@/types/api'

export const useCommentStore = defineStore('comment', () => {
  const comments = ref<Comment[]>([])
  const pagination = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function fetchComments(projectId: number, taskId: number, page = 1): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await commentService.list(projectId, taskId, { page })
      comments.value = result.data
      pagination.value = result.meta
    } catch (unknown) {
      error.value = describeApiError(unknown).message
    } finally {
      loading.value = false
    }
  }

  async function postComment(projectId: number, taskId: number, body: string): Promise<Comment> {
    submitting.value = true

    try {
      const comment = await commentService.create(projectId, taskId, body)

      // El backend ordena del más reciente al más antiguo.
      comments.value = [comment, ...comments.value]

      // Se sincroniza con el backend para respetar su orden y su paginación.
      await fetchComments(projectId, taskId, pagination.value?.current_page ?? 1)

      return comment
    } finally {
      submitting.value = false
    }
  }

  function reset(): void {
    comments.value = []
    pagination.value = null
    error.value = null
  }

  return {
    comments,
    pagination,
    loading,
    submitting,
    error,
    fetchComments,
    postComment,
    reset,
  }
})

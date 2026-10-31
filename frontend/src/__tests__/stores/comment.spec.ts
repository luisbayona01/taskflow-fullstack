import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { commentService } from '@/services/comment'
import { useCommentStore } from '@/stores/comment'
import { ApiRequestError } from '@/services/api'
import type { Comment, PaginationMeta } from '@/types/api'

vi.mock('@/services/comment', () => ({
  commentService: {
    list: vi.fn<
      (
        projectId: number,
        taskId: number,
        filters?: { page?: number; per_page?: number },
      ) => Promise<{ data: Comment[]; meta: PaginationMeta }>
    >(),
    create: vi.fn<(projectId: number, taskId: number, body: string) => Promise<Comment>>(),
  },
}))

const comment: Comment = {
  id: 1,
  body: 'Primer comentario',
  created_at: '2026-10-30 18:00:00',
  author: { id: 1, name: 'Ada Lovelace', email: 'ada@taskflow.test' },
}

const pagination: PaginationMeta = {
  current_page: 1,
  from: 1,
  last_page: 2,
  links: [],
  path: 'http://localhost/api/projects/1/tasks/1/comments',
  per_page: 15,
  to: 15,
  total: 20,
}

describe('stores/comment', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lista los comentarios con su paginación', async () => {
    vi.mocked(commentService.list).mockResolvedValue({ data: [comment], meta: pagination })
    const store = useCommentStore()

    await store.fetchComments(1, 1)

    expect(commentService.list).toHaveBeenCalledWith(1, 1, { page: 1 })
    expect(store.comments).toHaveLength(1)
    expect(store.comments[0]?.author.name).toBe('Ada Lovelace')
    expect(store.pagination?.last_page).toBe(2)
    expect(store.error).toBeNull()
  })

  it('expone el error cuando no se pueden cargar los comentarios', async () => {
    vi.mocked(commentService.list).mockRejectedValue(
      new ApiRequestError('No se ha encontrado el recurso solicitado.', 404),
    )
    const store = useCommentStore()

    await store.fetchComments(1, 1)

    expect(store.error).toContain('No se ha encontrado')
  })

  it('publica un comentario y actualiza el listado', async () => {
    vi.mocked(commentService.list).mockResolvedValue({ data: [], meta: pagination })
    vi.mocked(commentService.create).mockResolvedValue(comment)

    const store = useCommentStore()
    await store.fetchComments(1, 1)

    await store.postComment(1, 1, 'Primer comentario')

    expect(commentService.create).toHaveBeenCalledWith(1, 1, 'Primer comentario')
    // Tras publicar se sincroniza con el backend.
    expect(commentService.list).toHaveBeenCalledTimes(2)
    expect(store.submitting).toBe(false)
  })

  it('propaga los errores de validación al publicar', async () => {
    vi.mocked(commentService.create).mockRejectedValue(
      new ApiRequestError('Los datos enviados no son válidos.', 422, {
        body: ['The body field is required.'],
      }),
    )

    const store = useCommentStore()
    const error = await store.postComment(1, 1, '').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).fieldErrors.body).toEqual(['The body field is required.'])
    expect(store.submitting).toBe(false)
  })
})

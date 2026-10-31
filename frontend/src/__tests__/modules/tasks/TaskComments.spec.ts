import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

import TaskComments from '@/components/tasks/TaskComments.vue'
import { commentService } from '@/services/comment'
import { useAuthStore } from '@/stores/auth'
import { ApiRequestError } from '@/services/api'
import type { Comment, PaginationMeta, User } from '@/types/api'

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

const currentUser: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const comment: Comment = {
  id: 1,
  body: 'Primer comentario',
  created_at: '2026-10-30 18:00:00',
  author: { id: 1, name: 'Ada Lovelace', email: 'ada@taskflow.test' },
}

const pagination: PaginationMeta = {
  current_page: 1,
  from: 1,
  last_page: 1,
  links: [],
  path: 'http://localhost/api/projects/1/tasks/1/comments',
  per_page: 15,
  to: 1,
  total: 1,
}

async function mountComments() {
  const pinia = createPinia()
  setActivePinia(pinia)

  useAuthStore().$patch({ user: currentUser, token: 'fake-token' })

  const wrapper = mount(TaskComments, {
    props: { projectId: 10, taskId: 100 },
    global: { plugins: [pinia, ElementPlus] },
  })

  await flushPromises()

  return wrapper
}

describe('components/tasks/TaskComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(commentService.list).mockResolvedValue({ data: [comment], meta: pagination })
  })

  it('lista los comentarios mostrando el autor y la fecha', async () => {
    const wrapper = await mountComments()

    expect(commentService.list).toHaveBeenCalledWith(10, 100, { page: 1 })
    expect(wrapper.text()).toContain('Primer comentario')
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('30 oct 2026')
  })

  it('publica un comentario y actualiza el listado', async () => {
    vi.mocked(commentService.create).mockResolvedValue({
      ...comment,
      id: 2,
      body: 'Segundo comentario',
    })

    const wrapper = await mountComments()

    await wrapper.find('textarea').setValue('Segundo comentario')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(commentService.create).toHaveBeenCalledWith(10, 100, 'Segundo comentario')
    expect(commentService.list).toHaveBeenCalledTimes(2)
  })

  it('no publica el comentario si el contenido está vacío', async () => {
    const wrapper = await mountComments()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await flushPromises()

    expect(commentService.create).not.toHaveBeenCalled()
    expect(wrapper.find('.el-form-item__error').text()).toBe(
      'El comentario no puede estar vacío.',
    )
  })

  it('muestra el error devuelto por el backend al publicar', async () => {
    vi.mocked(commentService.create).mockRejectedValue(
      new ApiRequestError('Los datos enviados no son válidos.', 422, {
        body: ['The body field is required.'],
      }),
    )

    const wrapper = await mountComments()

    await wrapper.find('textarea').setValue('Comentario inválido')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await flushPromises()

    expect(wrapper.find('.el-form-item__error').text()).toBe('The body field is required.')
  })

  it('muestra el mensaje de error al cargar los comentarios', async () => {
    vi.mocked(commentService.list).mockRejectedValue(
      new ApiRequestError('No se ha encontrado el recurso solicitado.', 404),
    )

    const wrapper = await mountComments()

    expect(wrapper.text()).toContain('No se ha encontrado')
  })
})

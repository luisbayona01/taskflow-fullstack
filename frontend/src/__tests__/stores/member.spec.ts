import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { memberService } from '@/services/member'
import { useMemberStore } from '@/stores/member'
import { ApiRequestError } from '@/services/api'
import type { ProjectMember } from '@/types/api'

vi.mock('@/services/member', () => ({
  memberService: {
    list: vi.fn<(projectId: number) => Promise<ProjectMember[]>>(),
    add: vi.fn<(projectId: number, userId: number) => Promise<unknown>>(),
    remove: vi.fn<(projectId: number, userId: number) => Promise<void>>(),
  },
}))

const owner: ProjectMember = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const member: ProjectMember = {
  ...owner,
  id: 2,
  name: 'Grace Hopper',
  email: 'grace@taskflow.test',
}

describe('stores/member', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('lista los miembros del proyecto', async () => {
    vi.mocked(memberService.list).mockResolvedValue([owner, member])
    const store = useMemberStore()

    await store.fetchMembers(10)

    expect(memberService.list).toHaveBeenCalledWith(10)
    expect(store.members).toHaveLength(2)
    expect(store.isMember(2)).toBe(true)
    expect(store.isMember(99)).toBe(false)
    expect(store.error).toBeNull()
  })

  it('expone el error 403 cuando el usuario no puede administrar miembros', async () => {
    vi.mocked(memberService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )
    const store = useMemberStore()

    await store.fetchMembers(10)

    expect(store.members).toEqual([])
    expect(store.error).toContain('permisos')
  })

  it('agrega un miembro y recarga la lista', async () => {
    vi.mocked(memberService.list).mockResolvedValue([owner])
    vi.mocked(memberService.add).mockResolvedValue({
      success: true,
      message: 'User added to project successfully.',
      data: null,
    })

    const store = useMemberStore()
    await store.addMember(10, 2)

    expect(memberService.add).toHaveBeenCalledWith(10, 2)
    expect(memberService.list).toHaveBeenCalledTimes(1)
    expect(store.saving).toBe(false)
  })

  it('propaga el error 422 cuando el usuario ya pertenece al proyecto', async () => {
    vi.mocked(memberService.add).mockRejectedValue(
      new ApiRequestError('The user is already a member of this project.', 422, {
        user_id: ['The user is already a member of this project.'],
      }),
    )

    const store = useMemberStore()
    const error = await store.addMember(10, 2).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).isValidationError).toBe(true)
    expect(store.saving).toBe(false)
  })

  it('retira a un miembro y lo quita de la lista', async () => {
    vi.mocked(memberService.list).mockResolvedValue([owner, member])
    vi.mocked(memberService.remove).mockResolvedValue(undefined)

    const store = useMemberStore()
    await store.fetchMembers(10)

    await store.removeMember(10, 2)

    expect(memberService.remove).toHaveBeenCalledWith(10, 2)
    expect(store.members).toHaveLength(1)
    expect(store.removing).toBe(false)
  })

  it('propaga el error al retirar a alguien que no es miembro', async () => {
    vi.mocked(memberService.remove).mockRejectedValue(
      new ApiRequestError('No se ha encontrado el recurso solicitado.', 404),
    )

    const store = useMemberStore()
    const error = await store.removeMember(10, 9).catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(404)
    expect(store.removing).toBe(false)
  })
})

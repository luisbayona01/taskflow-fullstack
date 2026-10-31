import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'

import ProjectMembers from '@/components/projects/ProjectMembers.vue'
import { memberService } from '@/services/member'
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

async function mountMembers(canManage: boolean, currentUserId: number | null = 1) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(ProjectMembers, {
    props: {
      projectId: 10,
      projectOwnerId: owner.id,
      canManage,
      currentUserId,
    },
    global: { plugins: [pinia, ElementPlus] },
  })

  await flushPromises()

  return wrapper
}

describe('components/projects/ProjectMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(memberService.list).mockResolvedValue([owner, member])
  })

  it('lista los miembros con su nombre y su correo', async () => {
    const wrapper = await mountMembers(true)

    expect(memberService.list).toHaveBeenCalledWith(10)
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada@taskflow.test')
    expect(wrapper.text()).toContain('Grace Hopper')
    expect(wrapper.text()).toContain('grace@taskflow.test')
  })

  it('ofrece agregar integrantes solo al propietario', async () => {
    const ownerView = await mountMembers(true)
    const memberView = await mountMembers(false)

    expect(ownerView.findAll('button').some((b) => b.text().includes('Agregar integrante'))).toBe(
      true,
    )
    expect(memberView.findAll('button').some((b) => b.text().includes('Agregar integrante'))).toBe(
      false,
    )
  })

  it('no permite retirar al propietario del proyecto', async () => {
    const wrapper = await mountMembers(true)

    const rows = wrapper.findAll('.member-list__item')
    expect(rows).toHaveLength(2)

    const ownerRow = rows[0]!
    const memberRow = rows[1]!

    expect(ownerRow.text()).toContain('Propietario')
    expect(ownerRow.findAll('button')).toHaveLength(0)
    expect(memberRow.findAll('button').map((b) => b.text())).toContain('Retirar')
  })

  it('oculta las acciones administrativas a los miembros normales', async () => {
    const wrapper = await mountMembers(false)

    const buttons = wrapper.findAll('button').map((button) => button.text())

    expect(buttons).not.toContain('Retirar')
    expect(buttons).not.toContain('Agregar integrante')
  })

  it('muestra el mensaje de error 403 al cargar los miembros', async () => {
    vi.mocked(memberService.list).mockRejectedValue(
      new ApiRequestError('No tienes permisos para realizar esta acción.', 403),
    )

    const wrapper = await mountMembers(true)

    expect(wrapper.text()).toContain('No tienes permisos')
  })
})

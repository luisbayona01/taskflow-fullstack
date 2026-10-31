import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'

import RegisterView from '@/modules/auth/RegisterView.vue'
import { authService } from '@/services/auth'
import type { AuthPayload, User } from '@/types/api'

vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn<(payload: { email: string; password: string }) => Promise<AuthPayload>>(),
    register: vi.fn<
      (payload: {
        name: string
        email: string
        password: string
        password_confirmation: string
      }) => Promise<AuthPayload>
    >(),
    logout: vi.fn<() => Promise<void>>(),
    me: vi.fn<() => Promise<User>>(),
  },
}))

const user: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

const authPayload: AuthPayload = { user, token: 'fake-token', token_type: 'Bearer' }

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', name: 'register', component: RegisterView },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
      { path: '/', name: 'dashboard', component: { template: '<div>panel</div>' } },
    ],
  })
}

async function mountRegisterView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = buildRouter()
  await router.push('/register')
  await router.isReady()

  const wrapper = mount(RegisterView, {
    global: {
      plugins: [pinia, router],
      components: { ElForm, ElFormItem, ElInput, ElButton },
      stubs: { transition: false, 'transition-group': false },
    },
  })

  await flushPromises()

  return wrapper
}

describe('modules/auth/RegisterView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía el registro con la contraseña confirmada', async () => {
    vi.mocked(authService.register).mockResolvedValue(authPayload)

    const wrapper = await mountRegisterView()
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('Ada Lovelace')
    await inputs[1]!.setValue('ada@taskflow.test')
    await inputs[2]!.setValue('secret123')
    await inputs[3]!.setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@taskflow.test',
      password: 'secret123',
      password_confirmation: 'secret123',
    })
  })

  it('no registra si las contraseñas no coinciden', async () => {
    const wrapper = await mountRegisterView()
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('Ada Lovelace')
    await inputs[1]!.setValue('ada@taskflow.test')
    await inputs[2]!.setValue('secret123')
    await inputs[3]!.setValue('otra123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await flushPromises()

    expect(authService.register).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Las contraseñas no coinciden')
  })

  it('no registra si falta el nombre', async () => {
    const wrapper = await mountRegisterView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.register).not.toHaveBeenCalled()
  })

  it('muestra los errores de validación del backend', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new Error('The email has already been taken.'),
    )

    const wrapper = await mountRegisterView()
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('Ada Lovelace')
    await inputs[1]!.setValue('ada@taskflow.test')
    await inputs[2]!.setValue('secret123')
    await inputs[3]!.setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.register).toHaveBeenCalledTimes(1)
  })
})

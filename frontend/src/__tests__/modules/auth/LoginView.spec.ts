import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'

import LoginView from '@/modules/auth/LoginView.vue'
import { ApiRequestError } from '@/services/http'
import { authService } from '@/services/auth'
import type { AuthPayload, LoginPayload, RegisterPayload, User } from '@/types/api'

vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn<(payload: LoginPayload) => Promise<AuthPayload>>(),
    register: vi.fn<(payload: RegisterPayload) => Promise<AuthPayload>>(),
    logout: vi.fn<() => Promise<void>>(),
    me: vi.fn<() => Promise<User>>(),
  },
}))

/**
 * Element Plus muestra el mensaje de error con un debounce de 100 ms,
 * por lo que hay que dejar pasar ese tiempo antes de inspeccionar el DOM.
 */
async function waitForErrorMessage(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  await flushPromises()
}

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/register', name: 'register', component: { template: '<div>registro</div>' } },
      { path: '/', name: 'dashboard', component: { template: '<div>panel</div>' } },
    ],
  })
}

async function mountLoginView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = buildRouter()
  await router.push('/login')
  await router.isReady()

  const wrapper = mount(LoginView, {
    global: {
      plugins: [pinia, router],
      components: { ElForm, ElFormItem, ElInput, ElButton },
      stubs: { transition: false, 'transition-group': false },
    },
  })

  await flushPromises()

  return wrapper
}

describe('modules/auth/LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra los errores de validación del backend junto a cada campo', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new ApiRequestError('The given data was invalid.', 422, {
        email: ['El correo ya ha sido tomado.'],
      }),
    )

    const wrapper = await mountLoginView()
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('ada@taskflow.test')
    await inputs[1]!.setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await waitForErrorMessage()

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ada@taskflow.test',
      password: 'secret123',
    })
    expect(wrapper.find('.el-form-item__error').text()).toBe('El correo ya ha sido tomado.')
  })

  it('no llama a la API cuando la validación local del formulario falla', async () => {
    const wrapper = await mountLoginView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await waitForErrorMessage()

    expect(authService.login).not.toHaveBeenCalled()
    expect(wrapper.find('.el-form-item__error').exists()).toBe(true)
  })
})

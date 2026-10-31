import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import { clearStoredToken, getStoredToken } from '@/utils/storage'
import type { AuthPayload, LoginPayload, RegisterPayload, User } from '@/types/api'

vi.mock('@/services/auth', () => ({
  authService: {
    login: vi.fn<(payload: LoginPayload) => Promise<AuthPayload>>(),
    register: vi.fn<(payload: RegisterPayload) => Promise<AuthPayload>>(),
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

const authPayload: AuthPayload = {
  user,
  token: 'fake-token',
  token_type: 'Bearer',
}

describe('stores/auth', () => {
  beforeEach(() => {
    clearStoredToken()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('inicia sesión, guarda el token y lo persiste', async () => {
    vi.mocked(authService.login).mockResolvedValue(authPayload)

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'secret123' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(user)
    expect(store.token).toBe('fake-token')
    expect(getStoredToken()).toBe('fake-token')
  })

  it('no guarda la sesión cuando el backend rechaza las credenciales', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials.'))

    const store = useAuthStore()

    await expect(store.login({ email: user.email, password: 'wrong' })).rejects.toThrow(
      'Invalid credentials.',
    )

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it('restaura la sesión con un token persistido', async () => {
    vi.mocked(authService.me).mockResolvedValue(user)

    const store = useAuthStore()
    store.$patch({ token: 'fake-token' })

    const restored = await store.restoreSession()

    expect(restored).toBe(true)
    expect(store.user).toEqual(user)
  })

  it('descarta la sesión cuando el token persistido ya no es válido', async () => {
    vi.mocked(authService.me).mockRejectedValue(new Error('Unauthenticated.'))

    const store = useAuthStore()
    store.$patch({ token: 'expired-token' })

    const restored = await store.restoreSession()

    expect(restored).toBe(false)
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })

  it('cierra la sesión y limpia el token persistido', async () => {
    vi.mocked(authService.login).mockResolvedValue(authPayload)
    vi.mocked(authService.logout).mockResolvedValue(undefined)

    const store = useAuthStore()
    await store.login({ email: user.email, password: 'secret123' })
    await store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(getStoredToken()).toBeNull()
  })
})

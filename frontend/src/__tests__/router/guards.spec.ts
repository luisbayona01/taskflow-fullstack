import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types/api'

const user: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'ada@taskflow.test',
  email_verified_at: null,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

function signIn(): void {
  const authStore = useAuthStore()
  authStore.$patch({ token: 'fake-token', user })
}

describe('router/guards', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await router.replace('/login')
  })

  it('redirige al login las rutas protegidas cuando no hay sesión', async () => {
    await router.push('/projects')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/projects')
  })

  it('permite acceder a las rutas públicas sin sesión', async () => {
    await router.push('/register')

    expect(router.currentRoute.value.name).toBe('register')
  })

  it('redirige al panel cuando ya hay sesión y se visita el login', async () => {
    signIn()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('permite el acceso a las rutas protegidas con sesión activa', async () => {
    signIn()

    await router.push('/projects')

    expect(router.currentRoute.value.name).toBe('projects')
  })

  it('mantiene el layout por defecto en las rutas protegidas', async () => {
    signIn()

    await router.push('/projects/10/tasks/100')

    expect(router.currentRoute.value.name).toBe('task-detail')
    expect(router.currentRoute.value.matched.some((record) => record.path === '/')).toBe(true)
  })

  it('muestra la vista 404 para rutas inexistentes', async () => {
    signIn()

    await router.push('/ruta-inexistente')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('actualiza el título del documento según la ruta', async () => {
    signIn()

    await router.push('/projects')

    expect(document.title).toBe('Proyectos · TaskFlow')
  })
})

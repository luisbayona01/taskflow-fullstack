/**
 * Store de autenticación (Pinia).
 *
 * Mantiene la sesión (token + usuario), la persiste en `localStorage` y
 * expone las acciones de login, registro, logout y restauración de sesión.
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { authService } from '@/services/auth'
import { invalidateApiCache } from '@/services/api'
import { clearStoredToken, getStoredToken, storeToken } from '@/utils/storage'
import type { LoginPayload, RegisterPayload, User } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getStoredToken())
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => token.value !== null)
  const isReady = computed(() => user.value !== null)

  function setSession(newToken: string, newUser: User): void {
    token.value = newToken
    user.value = newUser
    storeToken(newToken)
  }

  function clearSession(): void {
    token.value = null
    user.value = null
    clearStoredToken()
    // Las respuestas cacheadas pertenecen a la sesión anterior.
    invalidateApiCache()
  }

  async function login(payload: LoginPayload): Promise<void> {
    loading.value = true

    try {
      const result = await authService.login(payload)
      setSession(result.token, result.user)
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<void> {
    loading.value = true

    try {
      const result = await authService.register(payload)
      setSession(result.token, result.user)
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      clearSession()
    }
  }

  /**
   * Recupera el usuario cuando existe un token persistido.
   * Devuelve `true` si la sesión sigue siendo válida.
   */
  async function restoreSession(): Promise<boolean> {
    if (!token.value) {
      return false
    }

    try {
      user.value = await authService.me()
      return true
    } catch {
      clearSession()
      return false
    }
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    isReady,
    login,
    register,
    logout,
    restoreSession,
    clearSession,
  }
})

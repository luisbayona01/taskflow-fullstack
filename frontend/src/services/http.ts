/**
 * Cliente HTTP centralizado (Axios).
 *
 * - `baseURL` configurable con `VITE_API_BASE_URL`.
 * - Interceptor de petición: adjunta el token de Sanctum (`Authorization: Bearer ...`).
 * - Interceptor de respuesta: normaliza los errores y centraliza el tratamiento
 *   del 401 (cierre de sesión) mediante un manejador registrado por la aplicación.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios'

import { getStoredToken } from '@/utils/storage'
import type { ApiErrorResponse } from '@/types/api'

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/** Error normalizado que reciben las vistas y los stores. */
export class ApiRequestError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
  }

  /** Errores de validación listos para pintarse junto a cada campo. */
  get fieldErrors(): Record<string, string[]> {
    return this.errors
  }
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * Registra el callback que se ejecuta cuando la API responde 401.
 * Evita dependencias circulares entre el cliente HTTP, el store y el router.
 */
export function onUnauthorized(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

http.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status ?? 0
    const payload = error.response?.data

    if (status === 401) {
      unauthorizedHandler?.()
    }

    const message =
      payload?.message ??
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Unexpected communication error with the API.')

    const errors = payload?.errors ?? {}

    return Promise.reject(new ApiRequestError(message, status, errors))
  },
)

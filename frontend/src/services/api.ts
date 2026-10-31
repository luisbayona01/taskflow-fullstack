/**
 * Cliente HTTP centralizado (Axios) para la API REST de TaskFlow (Laravel 12).
 *
 * Responsabilidades:
 * - `baseURL` configurable mediante `VITE_API_BASE_URL`.
 * - Cabeceras JSON (`Accept` y `Content-Type`) y `Authorization: Bearer` cuando
 *   existe una sesión activa (el token nunca se escribe en consola).
 * - Interceptores de request y response: el de response normaliza cualquier
 *   fallo a `ApiRequestError` y notifica el 401 al manejador registrado por la
 *   aplicación (cierre de sesión + navegación al login).
 * - Deduplicación de peticiones GET en vuelo y caché corta invalidada por
 *   cualquier mutación, para no repetir llamadas innecesarias.
 *
 * Los componentes nunca llaman a Axios directamente: usan los servicios de
 * `src/services/*`, que a su vez usan este cliente.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

import { getStoredToken } from '@/utils/storage'
import type { ApiError } from '@/types/api'

/** URL base de la API. Se define con `VITE_API_BASE_URL` (ver `.env.example`). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

/** Tiempo de vida de la caché de respuestas GET (ms). */
const GET_CACHE_TTL = 30_000

/**
 * Mensajes de cara al usuario para cada código de error de la API.
 * Se centralizan aquí para no duplicar la lógica en los componentes.
 */
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'No se ha podido completar la operación.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se ha encontrado el recurso solicitado.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiados intentos. Espera unos segundos antes de volver a intentarlo.',
  500: 'El servidor ha encontrado un error. Inténtalo de nuevo más tarde.',
}

/**
 * Error normalizado que reciben las vistas y los stores.
 *
 * `message` es un texto listo para mostrar al usuario; `serverMessage`
 * conserva el mensaje original del backend para depuración.
 */
export class ApiRequestError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>
  readonly serverMessage: string | null
  readonly retryAfter: number | null

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {},
    serverMessage: string | null = null,
    retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.errors = errors
    this.serverMessage = serverMessage
    this.retryAfter = retryAfter
  }

  /** Errores de validación (422) listos para pintarse junto a cada campo. */
  get fieldErrors(): Record<string, string[]> {
    return this.errors
  }

  get isValidationError(): boolean {
    return this.status === 422
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }

  get isServerError(): boolean {
    return this.status >= 500
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

/* -------------------------------------------------------------------------- */
/*  Instancia de Axios                                                         */
/* -------------------------------------------------------------------------- */

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
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status ?? 0
    const payload = error.response?.data
    const serverMessage = payload?.message ?? null
    const errors = payload?.errors ?? {}
    const retryAfter = readRetryAfter(error.response?.headers)

    if (status === 401) {
      invalidateApiCache()
      unauthorizedHandler?.()
    }

    return Promise.reject(
      new ApiRequestError(
        buildErrorMessage(status, serverMessage, retryAfter),
        status,
        errors,
        serverMessage,
        retryAfter,
      ),
    )
  },
)

function readRetryAfter(headers: AxiosResponse['headers'] | undefined): number | null {
  if (!headers) {
    return null
  }

  const raw = headers['retry-after']
  const value = Array.isArray(raw) ? raw[0] : raw

  if (value === undefined || value === null) {
    return null
  }

  const seconds = Number.parseInt(String(value), 10)

  return Number.isNaN(seconds) ? null : seconds
}

function buildErrorMessage(
  status: number,
  serverMessage: string | null,
  retryAfter: number | null,
): string {
  const base =
    DEFAULT_ERROR_MESSAGES[status] ??
    serverMessage ??
    'No se ha podido completar la operación. Inténtalo de nuevo.'

  if (status === 429 && retryAfter !== null) {
    return `${base} Vuelve a intentarlo en ${retryAfter} s.`
  }

  return base
}

/* -------------------------------------------------------------------------- */
/*  Caché y deduplicación de peticiones                                        */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  expiresAt: number
  response: AxiosResponse
}

const responseCache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<AxiosResponse>>()

function cacheKey(config: AxiosRequestConfig): string {
  const method = (config.method ?? 'get').toUpperCase()
  const params = config.params ? JSON.stringify(config.params) : ''

  return `${method} ${config.url ?? ''} ${params}`
}

/**
 * Vacía la caché de respuestas GET.
 * Se llama automáticamente tras cualquier mutación y al cerrar la sesión.
 */
export function invalidateApiCache(): void {
  responseCache.clear()
}

/**
 * Ejecuta una petición usando el cliente centralizado.
 *
 * - Las peticiones GET idénticas y simultáneas comparten la misma promesa
 *   (no se disparan varias veces).
 * - Las respuestas GET se cachean durante `GET_CACHE_TTL` y la caché se
 *   invalida en cuanto se produce cualquier mutación (POST/PUT/PATCH/DELETE).
 */
export async function request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const method = (config.method ?? 'get').toUpperCase()

  if (method !== 'GET') {
    invalidateApiCache()
    return http.request<T>(config)
  }

  const key = cacheKey(config)
  const cached = responseCache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.response as AxiosResponse<T>
  }

  const pending = pendingRequests.get(key)

  if (pending) {
    return pending as Promise<AxiosResponse<T>>
  }

  const promise = http
    .request<T>(config)
    .then((response) => {
      responseCache.set(key, { expiresAt: Date.now() + GET_CACHE_TTL, response })
      return response
    })
    .finally(() => {
      pendingRequests.delete(key)
    })

  pendingRequests.set(key, promise)

  return promise
}

export interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>
}

/** Fachada con forma similar a Axios que aplica caché y deduplicación. */
export const apiClient: ApiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>({ ...config, method: 'GET', url })
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>({ ...config, method: 'POST', url, data })
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>({ ...config, method: 'PUT', url, data })
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>({ ...config, method: 'PATCH', url, data })
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>({ ...config, method: 'DELETE', url })
  },
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'

import {
  ApiRequestError,
  apiClient,
  http,
  invalidateApiCache,
  onUnauthorized,
} from '@/services/api'
import { clearStoredToken, storeToken } from '@/utils/storage'

const originalAdapter = http.defaults.adapter

/** Adaptador de Axios que responde con una carga útil controlada. */
function respondWith(data: unknown, status = 200): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.resolve({
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config,
    })
}

/** Adaptador de Axios que simula una respuesta de error del backend. */
function failWith(
  status: number,
  data: { success: false; message: string; errors: Record<string, string[]> | null },
  headers: Record<string, string> = {},
): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        {
          data,
          status,
          statusText: 'Error',
          headers,
          config,
        },
      ),
    )
}

describe('services/api', () => {
  beforeEach(() => {
    clearStoredToken()
    invalidateApiCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    clearStoredToken()
    invalidateApiCache()
  })

  it('adjunta la cabecera Authorization con el token persistido', async () => {
    storeToken('token-abc')
    let request: InternalAxiosRequestConfig | undefined

    http.defaults.adapter = (config) => {
      request = config
      return respondWith({ success: true, message: 'ok', data: null })(config)
    }

    await apiClient.get('/me')

    expect(request?.headers.get('Authorization')).toBe('Bearer token-abc')
  })

  it('no adjunta la cabecera Authorization cuando no hay sesión', async () => {
    let request: InternalAxiosRequestConfig | undefined

    http.defaults.adapter = (config) => {
      request = config
      return respondWith({ success: true, message: 'ok', data: null })(config)
    }

    await apiClient.get('/projects')

    expect(request?.headers.get('Authorization')).toBeUndefined()
  })

  it('normaliza un 401, avisa al manejador registrado y limpia la caché', async () => {
    const handler = vi.fn<() => void>()
    onUnauthorized(handler)

    http.defaults.adapter = failWith(401, {
      success: false,
      message: 'Unauthenticated.',
      errors: null,
    })

    const error = await apiClient.get('/me').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(401)
    expect((error as ApiRequestError).isUnauthorized).toBe(true)
    expect((error as ApiRequestError).message).toContain('sesión')
    expect((error as ApiRequestError).fieldErrors).toEqual({})
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normaliza un 403 con un mensaje de permisos', async () => {
    http.defaults.adapter = failWith(403, {
      success: false,
      message: 'This action is unauthorized.',
      errors: null,
    })

    const error = await apiClient.get('/projects/1').catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(403)
    expect((error as ApiRequestError).isForbidden).toBe(true)
    expect((error as ApiRequestError).message).toContain('permisos')
  })

  it('normaliza un 404 con un mensaje de recurso no encontrado', async () => {
    http.defaults.adapter = failWith(404, {
      success: false,
      message: 'The requested resource was not found.',
      errors: null,
    })

    const error = await apiClient.get('/projects/999').catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(404)
    expect((error as ApiRequestError).isNotFound).toBe(true)
    expect((error as ApiRequestError).message).toContain('No se ha encontrado')
  })

  it('normaliza un 422 conservando los errores por campo', async () => {
    http.defaults.adapter = failWith(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { name: ['The name field is required.'] },
    })

    const error = await apiClient.post('/projects', {}).catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(422)
    expect((error as ApiRequestError).isValidationError).toBe(true)
    expect((error as ApiRequestError).fieldErrors.name).toEqual(['The name field is required.'])
    expect((error as ApiRequestError).serverMessage).toBe('The given data was invalid.')
  })

  it('normaliza un 429 indicando cuándo reintentar', async () => {
    http.defaults.adapter = failWith(
      429,
      {
        success: false,
        message: 'Too many login attempts. Please try again in 42 seconds.',
        errors: null,
      },
      { 'retry-after': '42' },
    )

    const error = await apiClient.post('/login', {}).catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(429)
    expect((error as ApiRequestError).isRateLimited).toBe(true)
    expect((error as ApiRequestError).retryAfter).toBe(42)
    expect((error as ApiRequestError).message).toContain('42 s')
  })

  it('normaliza un 500 con un mensaje genérico', async () => {
    http.defaults.adapter = failWith(500, {
      success: false,
      message: 'An unexpected error occurred.',
      errors: null,
    })

    const error = await apiClient.get('/projects').catch((reason: unknown) => reason)

    expect((error as ApiRequestError).status).toBe(500)
    expect((error as ApiRequestError).isServerError).toBe(true)
    expect((error as ApiRequestError).message).toContain('servidor')
  })

  it('acepta respuestas 201 y 204 sin cuerpo', async () => {
    http.defaults.adapter = (config) =>
      Promise.resolve({
        data: '',
        status: 204,
        statusText: 'No Content',
        headers: {},
        config,
      })

    const response = await apiClient.delete('/projects/1')

    expect(response.status).toBe(204)
    expect(response.data).toBe('')
  })

  it('devuelve un error normalizado cuando el backend no responde', async () => {
    http.defaults.adapter = () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK'))

    const error = await apiClient.get('/projects').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(0)
  })

  it('deduplica las peticiones GET idénticas y simultáneas', async () => {
    const adapter = vi.fn<AxiosAdapter>(respondWith({ success: true, message: 'ok', data: [] }))
    http.defaults.adapter = adapter

    await Promise.all([apiClient.get('/projects'), apiClient.get('/projects')])

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('reutiliza la respuesta cacheada de un GET y la invalida al mutar', async () => {
    const adapter = vi.fn<AxiosAdapter>(respondWith({ success: true, message: 'ok', data: [] }))
    http.defaults.adapter = adapter

    await apiClient.get('/projects')
    await apiClient.get('/projects')
    expect(adapter).toHaveBeenCalledTimes(1)

    await apiClient.post('/projects', { name: 'Nuevo' })
    expect(adapter).toHaveBeenCalledTimes(2)

    await apiClient.get('/projects')
    expect(adapter).toHaveBeenCalledTimes(3)
  })
})

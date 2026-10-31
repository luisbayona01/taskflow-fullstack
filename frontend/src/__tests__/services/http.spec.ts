import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'

import { ApiRequestError, http, onUnauthorized } from '@/services/http'
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
          headers: {},
          config,
        },
      ),
    )
}

describe('services/http', () => {
  beforeEach(() => {
    clearStoredToken()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    clearStoredToken()
  })

  it('adjunta la cabecera Authorization con el token persistido', async () => {
    storeToken('token-abc')
    let request: InternalAxiosRequestConfig | undefined

    http.defaults.adapter = (config) => {
      request = config
      return respondWith({ success: true, message: 'ok', data: null })(config)
    }

    await http.get('/me')

    expect(request?.headers.get('Authorization')).toBe('Bearer token-abc')
  })

  it('no adjunta la cabecera Authorization cuando no hay sesión', async () => {
    let request: InternalAxiosRequestConfig | undefined

    http.defaults.adapter = (config) => {
      request = config
      return respondWith({ success: true, message: 'ok', data: null })(config)
    }

    await http.get('/projects')

    expect(request?.headers.get('Authorization')).toBeUndefined()
  })

  it('normaliza un 401 en ApiRequestError y avisa al manejador registrado', async () => {
    const handler = vi.fn<() => void>()
    onUnauthorized(handler)

    http.defaults.adapter = failWith(401, {
      success: false,
      message: 'Unauthenticated.',
      errors: null,
    })

    const error = await http.get('/me').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(401)
    expect((error as ApiRequestError).message).toBe('Unauthenticated.')
    expect((error as ApiRequestError).fieldErrors).toEqual({})
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('normaliza un 422 conservando los errores por campo', async () => {
    http.defaults.adapter = failWith(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { email: ['El correo ya ha sido tomado.'] },
    })

    const error = await http.post('/login', {}).catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(422)
    expect((error as ApiRequestError).fieldErrors.email).toEqual(['El correo ya ha sido tomado.'])
  })

  it('devuelve un error normalizado cuando el backend no responde', async () => {
    http.defaults.adapter = () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK'))

    const error = await http.get('/projects').catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).status).toBe(0)
    expect((error as ApiRequestError).message).toBe('Unexpected communication error with the API.')
  })
})

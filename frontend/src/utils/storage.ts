/**
 * Acceso seguro al `localStorage` (SSR-safe y tolerante a modo privado).
 */

const TOKEN_KEY = 'taskflow.token'

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function getStoredToken(): string | null {
  if (!isStorageAvailable()) {
    return null
  }

  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  if (!isStorageAvailable()) {
    return
  }

  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* El token queda solo en memoria si el almacenamiento no está disponible. */
  }
}

export function clearStoredToken(): void {
  if (!isStorageAvailable()) {
    return
  }

  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

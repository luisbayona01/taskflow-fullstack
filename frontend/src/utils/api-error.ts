/**
 * Utilidad para traducir cualquier error a un mensaje mostrable y a los
 * errores de validación por campo. Evita duplicar esta lógica en cada
 * componente: el texto siempre sale de la capa HTTP centralizada.
 */

import { ApiRequestError } from '@/services/api'

export interface ApiErrorDescription {
  /** Mensaje listo para mostrar al usuario. */
  message: string
  /** Errores por campo (422). Vacío en el resto de códigos. */
  fieldErrors: Record<string, string[]>
}

const GENERIC_MESSAGE = 'No se ha podido completar la operación. Inténtalo de nuevo.'

export function describeApiError(error: unknown): ApiErrorDescription {
  if (error instanceof ApiRequestError) {
    return {
      message: error.message,
      fieldErrors: error.fieldErrors,
    }
  }

  return {
    message: GENERIC_MESSAGE,
    fieldErrors: {},
  }
}

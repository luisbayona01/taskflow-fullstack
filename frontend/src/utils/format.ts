/**
 * Formateo de fechas en español, tolerante a los formatos que devuelve
 * Laravel (ISO 8601 con microsegundos y `Y-m-d H:i:s`).
 */

function parseDate(value: string): Date | null {
  // Laravel puede enviar "2026-10-31 15:23:40" o ISO con microsegundos.
  const normalized = value.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1')
  const date = new Date(normalized)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = parseDate(value)

  if (!date) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = parseDate(value)

  if (!date) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

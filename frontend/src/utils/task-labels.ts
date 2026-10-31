/**
 * Etiquetas y colores de los estados y prioridades de tarea.
 */

import type { TaskPriority, TaskStatus } from '@/types/api'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Completada',
}

export const TASK_STATUS_TAG_TYPES: Record<TaskStatus, 'info' | 'warning' | 'success'> = {
  pending: 'info',
  in_progress: 'warning',
  done: 'success',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const TASK_PRIORITY_TAG_TYPES: Record<TaskPriority, 'info' | 'warning' | 'danger'> = {
  low: 'info',
  medium: 'warning',
  high: 'danger',
}

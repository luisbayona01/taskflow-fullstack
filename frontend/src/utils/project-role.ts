/**
 * Resolución del rol del usuario actual sobre un proyecto.
 *
 * El backend sigue siendo la autoridad de la autorización: esta función solo
 * sirve para ocultar o habilitar acciones en la interfaz.
 */

import type { Project, ProjectRole } from '@/types/api'

export function resolveProjectRole(project: Project, userId: number | null): ProjectRole {
  if (userId === null) {
    return 'member'
  }

  return project.owner_id === userId ? 'owner' : 'member'
}

/**
 * Rol de un miembro dentro de un proyecto. El propietario del proyecto es el
 * único con rol `owner`; el resto son `member`.
 */
export function roleForMember(memberId: number, ownerId: number): ProjectRole {
  return memberId === ownerId ? 'owner' : 'member'
}

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Propietario',
  member: 'Miembro',
}

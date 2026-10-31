/**
 * Servicio de miembros de un proyecto.
 *
 * Rutas verificadas en `backend/routes/api.php`:
 * - GET    /api/projects/{project}/members
 * - POST   /api/projects/{project}/members
 * - DELETE /api/projects/{project}/members/{user}
 */

import { apiClient } from './api'
import type { MembersResponse, MessageResponse, ProjectMember } from '@/types/api'

export interface MemberService {
  list(projectId: number): Promise<ProjectMember[]>
  add(projectId: number, userId: number): Promise<MessageResponse>
  remove(projectId: number, userId: number): Promise<void>
}

export const memberService: MemberService = {
  async list(projectId: number): Promise<ProjectMember[]> {
    const { data } = await apiClient.get<MembersResponse>(`/projects/${projectId}/members`)
    return data.data.members
  },

  async add(projectId: number, userId: number): Promise<MessageResponse> {
    const { data } = await apiClient.post<MessageResponse>(`/projects/${projectId}/members`, {
      user_id: userId,
    })
    return data
  },

  async remove(projectId: number, userId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`)
  },
}

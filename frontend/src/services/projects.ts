/**
 * Servicios de proyectos, miembros y estadísticas.
 */

import { http } from './http'
import type {
  MembersResponse,
  MessageResponse,
  Project,
  ProjectPayload,
  ProjectStats,
  ProjectsResponse,
  ProjectResponse,
  StatsResponse,
  User,
} from '@/types/api'

export const projectsService = {
  async list(): Promise<Project[]> {
    const { data } = await http.get<ProjectsResponse>('/projects')
    return data.data.projects
  },

  async create(payload: ProjectPayload): Promise<Project> {
    const { data } = await http.post<ProjectResponse>('/projects', payload)
    return data.data.project
  },

  async show(projectId: number): Promise<Project> {
    const { data } = await http.get<ProjectResponse>(`/projects/${projectId}`)
    return data.data.project
  },

  async update(projectId: number, payload: Partial<ProjectPayload>): Promise<Project> {
    const { data } = await http.put<ProjectResponse>(`/projects/${projectId}`, payload)
    return data.data.project
  },

  async remove(projectId: number): Promise<void> {
    await http.delete(`/projects/${projectId}`)
  },

  async members(projectId: number): Promise<User[]> {
    const { data } = await http.get<MembersResponse>(`/projects/${projectId}/members`)
    return data.data.members
  },

  async addMember(projectId: number, userId: number): Promise<MessageResponse> {
    const { data } = await http.post<MessageResponse>(`/projects/${projectId}/members`, {
      user_id: userId,
    })
    return data
  },

  async removeMember(projectId: number, userId: number): Promise<void> {
    await http.delete(`/projects/${projectId}/members/${userId}`)
  },

  async stats(projectId: number): Promise<ProjectStats> {
    const { data } = await http.get<StatsResponse>(`/projects/${projectId}/stats`)
    return data.data
  },
}

/**
 * Servicio de proyectos.
 *
 * Rutas verificadas en `backend/routes/api.php`:
 * - GET    /api/projects
 * - POST   /api/projects
 * - GET    /api/projects/{project}
 * - PUT    /api/projects/{project}   (PATCH también disponible)
 * - DELETE /api/projects/{project}
 * - GET    /api/projects/{project}/stats
 */

import { apiClient } from './api'
import type {
  Project,
  ProjectPayload,
  ProjectResponse,
  ProjectsResponse,
  ProjectStats,
  StatsResponse,
} from '@/types/api'

export interface ProjectService {
  list(): Promise<Project[]>
  get(projectId: number): Promise<Project>
  create(payload: ProjectPayload): Promise<Project>
  update(projectId: number, payload: ProjectPayload): Promise<Project>
  remove(projectId: number): Promise<void>
  stats(projectId: number): Promise<ProjectStats>
}

export const projectService: ProjectService = {
  async list(): Promise<Project[]> {
    const { data } = await apiClient.get<ProjectsResponse>('/projects')
    return data.data.projects
  },

  async get(projectId: number): Promise<Project> {
    const { data } = await apiClient.get<ProjectResponse>(`/projects/${projectId}`)
    return data.data.project
  },

  async create(payload: ProjectPayload): Promise<Project> {
    const { data } = await apiClient.post<ProjectResponse>('/projects', payload)
    return data.data.project
  },

  async update(projectId: number, payload: ProjectPayload): Promise<Project> {
    const { data } = await apiClient.put<ProjectResponse>(`/projects/${projectId}`, payload)
    return data.data.project
  },

  async remove(projectId: number): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`)
  },

  async stats(projectId: number): Promise<ProjectStats> {
    const { data } = await apiClient.get<StatsResponse>(`/projects/${projectId}/stats`)
    return data.data
  },
}

/**
 * Store de proyectos (Pinia).
 *
 * Centraliza el estado y las operaciones del módulo de proyectos para que las
 * vistas no repitan llamadas HTTP ni lógica de errores.
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { projectService } from '@/services/project'
import { taskService } from '@/services/task'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/api-error'
import { resolveProjectRole } from '@/utils/project-role'
import type { Project, ProjectPayload, ProjectRole, ProjectStats, Task } from '@/types/api'

export const useProjectStore = defineStore('project', () => {
  const authStore = useAuthStore()

  const projects = ref<Project[]>([])
  const statsByProject = ref<Record<number, ProjectStats>>({})
  const current = ref<Project | null>(null)
  const currentStats = ref<ProjectStats | null>(null)
  const currentTasks = ref<Task[]>([])

  const loading = ref(false)
  const detailLoading = ref(false)
  const tasksLoading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)

  const error = ref<string | null>(null)
  const detailError = ref<string | null>(null)

  /** Identificador del usuario autenticado (null si la sesión no está lista). */
  const currentUserId = computed<number | null>(() => authStore.user?.id ?? null)

  /** No hay proyectos cargados (la vista decide si muestra vacío o error). */
  const isEmpty = computed(() => projects.value.length === 0)

  /** Rol del usuario actual sobre un proyecto concreto. */
  function roleFor(project: Project): ProjectRole {
    return resolveProjectRole(project, currentUserId.value)
  }

  function isOwner(project: Project): boolean {
    return roleFor(project) === 'owner'
  }

  async function fetchProjects(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      projects.value = await projectService.list()
    } catch (unknown) {
      projects.value = []
      error.value = describeApiError(unknown).message
    } finally {
      loading.value = false
    }
  }

  /**
   * Carga las estadísticas de los proyectos indicados en paralelo.
   * Un fallo puntual no invalida el resto: la vista muestra "—" en ese proyecto.
   */
  async function fetchStats(projectIds: number[]): Promise<void> {
    const pending = projectIds.filter((id) => statsByProject.value[id] === undefined)

    if (pending.length === 0) {
      return
    }

    await Promise.all(
      pending.map(async (id) => {
        try {
          statsByProject.value[id] = await projectService.stats(id)
        } catch {
          // Las estadísticas son informativas: se omiten si fallan.
        }
      }),
    )
  }

  async function fetchProject(projectId: number): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    current.value = null
    currentStats.value = null
    currentTasks.value = []

    try {
      current.value = await projectService.get(projectId)

      await Promise.all([fetchProjectStats(projectId), fetchProjectTasks(projectId)])
    } catch (unknown) {
      detailError.value = describeApiError(unknown).message
    } finally {
      detailLoading.value = false
    }
  }

  async function fetchProjectStats(projectId: number): Promise<void> {
    try {
      currentStats.value = await projectService.stats(projectId)
    } catch {
      currentStats.value = null
    }
  }

  async function fetchProjectTasks(projectId: number): Promise<void> {
    tasksLoading.value = true

    try {
      const result = await taskService.list(projectId)
      currentTasks.value = result.tasks
    } catch {
      currentTasks.value = []
    } finally {
      tasksLoading.value = false
    }
  }

  async function createProject(payload: ProjectPayload): Promise<Project> {
    saving.value = true

    try {
      const project = await projectService.create(payload)
      projects.value = [project, ...projects.value]

      return project
    } finally {
      saving.value = false
    }
  }

  async function updateProject(projectId: number, payload: ProjectPayload): Promise<Project> {
    saving.value = true

    try {
      const project = await projectService.update(projectId, payload)
      current.value = project

      const index = projects.value.findIndex((item) => item.id === projectId)

      if (index !== -1) {
        projects.value[index] = { ...projects.value[index], ...project }
      }

      return project
    } finally {
      saving.value = false
    }
  }

  async function deleteProject(projectId: number): Promise<void> {
    deleting.value = true

    try {
      await projectService.remove(projectId)
      projects.value = projects.value.filter((project) => project.id !== projectId)
      delete statsByProject.value[projectId]

      if (current.value?.id === projectId) {
        current.value = null
      }
    } finally {
      deleting.value = false
    }
  }

  function reset(): void {
    projects.value = []
    statsByProject.value = {}
    current.value = null
    currentStats.value = null
    currentTasks.value = []
    error.value = null
    detailError.value = null
  }

  return {
    projects,
    statsByProject,
    current,
    currentStats,
    currentTasks,
    loading,
    detailLoading,
    tasksLoading,
    saving,
    deleting,
    error,
    detailError,
    isEmpty,
    currentUserId,
    roleFor,
    isOwner,
    fetchProjects,
    fetchStats,
    fetchProject,
    fetchProjectStats,
    fetchProjectTasks,
    createProject,
    updateProject,
    deleteProject,
    reset,
  }
})

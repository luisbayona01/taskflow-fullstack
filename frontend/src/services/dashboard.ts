/**
 * Servicio del panel de control (dashboard).
 *
 * El backend no expone un endpoint agregado de dashboard, por lo que este
 * servicio compone endpoints reales y existentes:
 * - GET /api/projects
 * - GET /api/projects/{project}/stats
 *
 * Las estadísticas se piden en paralelo y solo para los primeros proyectos
 * (`MAX_STATS_PROJECTS`) para no generar una avalancha de peticiones; el
 * resto se calcularía bajo demanda en la vista.
 */

import { projectService } from './project'
import type { Project, ProjectStats } from '@/types/api'

/** Número máximo de proyectos cuyas estadísticas se cargan de forma anticipada. */
const MAX_STATS_PROJECTS = 6

export interface DashboardTotals {
  projects: number
  tasks: number
  pending: number
  in_progress: number
  done: number
  overdue: number
  progress_percentage: number
}

export interface DashboardOverview {
  projects: Project[]
  stats: Record<number, ProjectStats>
  totals: DashboardTotals
}

export interface DashboardService {
  overview(): Promise<DashboardOverview>
}

function emptyTotals(projects: number): DashboardTotals {
  return {
    projects,
    tasks: 0,
    pending: 0,
    in_progress: 0,
    done: 0,
    overdue: 0,
    progress_percentage: 0,
  }
}

export const dashboardService: DashboardService = {
  async overview(): Promise<DashboardOverview> {
    const projects = await projectService.list()
    const totals = emptyTotals(projects.length)

    const stats: Record<number, ProjectStats> = {}

    await Promise.all(
      projects.slice(0, MAX_STATS_PROJECTS).map(async (project) => {
        try {
          stats[project.id] = await projectService.stats(project.id)
        } catch {
          // Las estadísticas son complementarias: si fallan, el resto del
          // panel sigue siendo utilizable.
        }
      }),
    )

    for (const value of Object.values(stats)) {
      totals.tasks += value.total_tasks
      totals.pending += value.pending
      totals.in_progress += value.in_progress
      totals.done += value.done
      totals.overdue += value.overdue
    }

    totals.progress_percentage =
      totals.tasks > 0 ? Math.round((totals.done / totals.tasks) * 100) : 0

    return { projects, stats, totals }
  },
}

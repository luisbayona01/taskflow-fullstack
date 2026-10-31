/**
 * Tipos del contrato de la API REST de TaskFlow (backend Laravel 12).
 *
 * Reflejan exactamente los API Resources y el envoltorio `ApiResponse`
 * que expone el backend, de modo que la SPA no tenga que adivinar formas.
 */

/** Envoltorio estándar de las respuestas exitosas del backend. */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/** Envoltorio estándar de las respuestas de error del backend. */
export interface ApiErrorResponse {
  success: false
  message: string
  errors: Record<string, string[]> | null
}

/** Envoltorio de las colecciones de recursos paginadas (API Resource collection). */
export interface PaginatedCollection<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Project {
  id: number
  name: string
  description: string | null
  owner_id: number
  owner?: User | null
  members?: User[] | null
  created_at: string | null
  updated_at: string | null
}

export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ProjectRole = 'owner' | 'member'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus | null
  priority: TaskPriority | null
  due_date: string | null
  project_id: number
  assigned_to: number | null
  assigned_user?: User | null
  created_at: string | null
  updated_at: string | null
}

export interface CommentAuthor {
  id: number
  name: string
  email: string
}

export interface Comment {
  id: number
  body: string
  created_at: string
  author: CommentAuthor
}

export interface ProjectStats {
  total_tasks: number
  pending: number
  in_progress: number
  done: number
  overdue: number
  progress_percentage: number
}

export interface TaskPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

/* -------------------------------------------------------------------------- */
/*  Requests                                                                   */
/* -------------------------------------------------------------------------- */

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthPayload {
  user: User
  token: string
  token_type: string
}

export interface ProjectPayload {
  name: string
  description?: string | null
}

export interface TaskPayload {
  title: string
  description?: string | null
  status?: TaskStatus | null
  priority?: TaskPriority | null
  due_date?: string | null
  assigned_to?: number | null
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: number
  due_date_from?: string
  due_date_to?: string
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'title' | 'status' | 'priority'
  sort_direction?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

/* -------------------------------------------------------------------------- */
/*  Responses                                                                  */
/* -------------------------------------------------------------------------- */

export type AuthResponse = ApiResponse<AuthPayload>
export type UserResponse = ApiResponse<{ user: User }>
export type ProjectsResponse = ApiResponse<{ projects: Project[] }>
export type ProjectResponse = ApiResponse<{ project: Project }>
export type MembersResponse = ApiResponse<{ members: User[] }>
export type MessageResponse = ApiResponse<null>
export type TaskResponse = ApiResponse<{ task: Task }>
export type TasksResponse = ApiResponse<{ tasks: Task[]; pagination: TaskPagination }>
/** `GET /projects/{id}/stats` devuelve los datos sin el envoltorio `success/message`. */
export type StatsResponse = { data: ProjectStats }
/** Los comentarios se serializan como `JsonResource`, sin envoltorio `success/message`. */
export type CommentResponse = { data: Comment }
export type CommentsResponse = PaginatedCollection<Comment>

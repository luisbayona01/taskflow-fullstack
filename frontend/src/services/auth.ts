/**
 * Servicio de autenticación contra la API de TaskFlow.
 *
 * Rutas verificadas en `backend/routes/api.php`:
 * - POST   /api/register
 * - POST   /api/login
 * - POST   /api/logout
 * - GET    /api/me
 */

import { apiClient } from './api'
import type {
  AuthPayload,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  UserResponse,
} from '@/types/api'

export interface AuthService {
  login(payload: LoginPayload): Promise<AuthPayload>
  register(payload: RegisterPayload): Promise<AuthPayload>
  logout(): Promise<void>
  me(): Promise<User>
}

export const authService: AuthService = {
  async login(payload: LoginPayload): Promise<AuthPayload> {
    const { data } = await apiClient.post<AuthResponse>('/login', payload)
    return data.data
  },

  async register(payload: RegisterPayload): Promise<AuthPayload> {
    const { data } = await apiClient.post<AuthResponse>('/register', payload)
    return data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/logout')
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<UserResponse>('/me')
    return data.data.user
  },
}

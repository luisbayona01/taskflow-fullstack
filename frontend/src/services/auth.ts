/**
 * Servicios de autenticación contra la API de TaskFlow.
 */

import { http } from './http'
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
    const { data } = await http.post<AuthResponse>('/login', payload)
    return data.data
  },

  async register(payload: RegisterPayload): Promise<AuthPayload> {
    const { data } = await http.post<AuthResponse>('/register', payload)
    return data.data
  },

  async logout(): Promise<void> {
    await http.post('/logout')
  },

  async me(): Promise<User> {
    const { data } = await http.get<UserResponse>('/me')
    return data.data.user
  },
}

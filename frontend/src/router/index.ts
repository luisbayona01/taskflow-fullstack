/**
 * Rutas de la SPA.
 *
 * - Las vistas se cargan de forma diferida (lazy) para no penalizar el bundle inicial.
 * - Las rutas `meta.requiresAuth` están protegidas: sin sesión se redirige a `/login`.
 * - Los módulos se organizes en `src/modules/<modulo>/`.
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/modules/auth/LoginView.vue'),
        meta: { guestOnly: true, title: 'Iniciar sesión' },
      },
    ],
  },
  {
    path: '/register',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('@/modules/auth/RegisterView.vue'),
        meta: { guestOnly: true, title: 'Crear cuenta' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/modules/dashboard/DashboardView.vue'),
        meta: { requiresAuth: true, title: 'Panel' },
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/modules/projects/ProjectListView.vue'),
        meta: { requiresAuth: true, title: 'Proyectos' },
      },
      {
        path: 'projects/:projectId',
        name: 'project-detail',
        component: () => import('@/modules/projects/ProjectDetailView.vue'),
        meta: { requiresAuth: true, title: 'Detalle del proyecto' },
      },
      {
        path: 'projects/:projectId/tasks',
        name: 'task-list',
        component: () => import('@/modules/tasks/TaskListView.vue'),
        meta: { requiresAuth: true, title: 'Tareas del proyecto' },
      },
      {
        path: 'projects/:projectId/tasks/:taskId',
        name: 'task-detail',
        component: () => import('@/modules/tasks/TaskDetailView.vue'),
        meta: { requiresAuth: true, title: 'Detalle de la tarea' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/modules/dashboard/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated && !authStore.isReady) {
    await authStore.restoreSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · TaskFlow` : 'TaskFlow'
})

export default router

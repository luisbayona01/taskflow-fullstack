# TaskFlow · Frontend

SPA de TaskFlow construida con **Vue 3 + TypeScript + Composition API**, **Vue Router**,
**Pinia**, **Axios** y **Element Plus**. Consume la API REST del backend Laravel 12 que
vive en `../backend`.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # si no existe
npm run dev               # http://localhost:5173
```

### Variables de entorno

| Variable             | Valor por defecto                  | Descripción                                      |
| -------------------- | ---------------------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL`  | `http://127.0.0.1:8000/api`        | URL base de la API. También puede ser `/api` para usar el proxy de Vite. |
| `DEV_PROXY_TARGET`   | `http://127.0.0.1:8000`            | Destino del proxy de Vite (sólo servidor de desarrollo). Con el backend en Docker: `http://127.0.0.1:8010`. |

Con `VITE_API_BASE_URL=/api` el servidor de desarrollo hace de proxy hacia
`http://127.0.0.1:8000` (ver `vite.config.ts`), lo que evita problemas de CORS.
`DEV_PROXY_TARGET` permite apuntar ese proxy al backend en Docker (puerto `8010`).

## Ejecución con Docker

La SPA forma parte del `docker-compose.yml` de la raíz del repositorio:

```bash
docker compose up -d --build    # compila la SPA y levanta el stack completo
docker compose logs -f frontend
docker compose down             # parar conservando los datos
```

| Contenedor          | Puerto host | Descripción |
| ------------------- | ----------- | ----------- |
| `taskflow-frontend` | `4300`      | SPA compilada (`npm ci` + `npm run build`) servida por Nginx. |

La imagen se construye con `VITE_API_BASE_URL=/api`, de modo que la SPA consume la API
en el **mismo origen** y el Nginx del contenedor hace de proxy de `/api` hacia
`backend-nginx` (sin CORS). La SPA queda disponible en http://localhost:4300.

## Scripts

| Script                  | Descripción                                              |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo con HMR.                           |
| `npm run build`         | `vue-tsc --build` + `vite build` (comprueba tipos y compila). |
| `npm run preview`       | Sirve la build de `dist/`.                                |
| `npm run type-check`    | Comprobación de tipos (incluye `src/` y `e2e/`).          |
| `npm run lint`          | `oxlint` + `eslint` (con auto-fix).                       |
| `npm run format`        | `prettier --write` sobre `src/`, `e2e/` y configuración.  |
| `npm run test:unit`     | Suite de Vitest + Vue Test Utils (ejecución única).        |
| `npm run test:unit:watch` | Suite de Vitest en modo watch.                          |
| `npm run test:e2e`      | Suite de Playwright (Chromium, Firefox y WebKit).          |

## Arquitectura

```
src/
├── assets/styles/      Estilos globales y variables CSS
├── components/
│   ├── layout/         Cabecera y menú lateral
│   ├── projects/       ProjectListView, ProjectCard, ProjectTable,
│   │                   ProjectForm, ProjectMembers, MemberList, AddMemberDialog
│   └── tasks/          TaskForm, TaskFilters, TaskComments,
│                       CommentForm, CommentItem
├── layouts/            DefaultLayout (app) y AuthLayout (login/registro)
├── modules/            Vistas agrupadas por módulo
│   ├── auth/           LoginView, RegisterView
│   ├── dashboard/      DashboardView, NotFoundView
│   ├── projects/       ProjectListView, ProjectDetailView
│   └── tasks/          TaskListView, TaskDetailView
├── router/             Rutas perezosas + guards `requiresAuth` / `guestOnly`
├── services/           Cliente HTTP y un servicio por módulo
├── stores/             Stores Pinia (auth, project, task, member, comment)
├── types/              Contrato tipado de la API
└── utils/              Utilidades (formato, roles, etiquetas, errores)
```

Reglas aplicadas:

- Todas las vistas usan `<script setup lang="ts">` y Composition API.
- Las vistas **no** llaman a Axios: consumen los stores, que a su vez usan los servicios.
- Los componentes no repiten lógica de errores: `describeApiError()` centraliza los mensajes.
- No hay `any`, ni `console.*`, ni dependencias de UI distintas de Element Plus.

### Capa HTTP

`src/services/api.ts` es el único punto de contacto con el backend:

- `baseURL` configurable con `VITE_API_BASE_URL`.
- Cabeceras `Accept`/`Content-Type` JSON y `Authorization: Bearer <token>` (el token nunca
  se escribe en la consola).
- Normalización de errores en `ApiRequestError` con `status`, `errors` (422 por campo),
  `retryAfter` (429) y banderas (`isValidationError`, `isUnauthorized`, `isForbidden`,
  `isNotFound`, `isRateLimited`, `isServerError`).
- Un `401` dispara `onUnauthorized()`: se cierra la sesión y se navega al login.
- Deduplicación de peticiones GET en vuelo y caché de 30 s invalidada por cualquier
  mutación o al cerrar sesión.

### Contrato con el backend

Los tipos de `src/types/api.ts` reflejan las respuestas reales verificadas contra
`backend/routes/api.php` y `backend/documentacion/api-docs.json`:

| Endpoint                                          | Método    | Respuesta                                       |
| ------------------------------------------------- | --------- | ----------------------------------------------- |
| `/register`, `/login`, `/logout`, `/me`           | POST/GET  | `{ success, message, data }`                    |
| `/projects`                                       | GET/POST  | `{ success, message, data: { projects } }`      |
| `/projects/{id}`                                  | GET/PUT/DELETE | `{ success, message, data: { project } }`  |
| `/projects/{id}/members`                          | GET/POST  | `{ success, message, data: { members } }`       |
| `/projects/{id}/members/{user}`                   | DELETE    | 204                                             |
| `/projects/{id}/stats`                            | GET       | `{ data }` (sin envoltorio `success`)           |
| `/projects/{id}/tasks`                            | GET/POST  | `{ success, message, data: { tasks, pagination } }` |
| `/projects/{id}/tasks/{task}`                     | GET/PUT/PATCH/DELETE | `{ success, message, data: { task } }` |
| `/projects/{id}/tasks/{task}/comments`            | GET/POST  | `JsonResource`: `{ data, links, meta }` / `{ data }` |

La paginación de tareas es un objeto propio del backend
(`total`, `per_page`, `current_page`, `last_page`, `from`, `to`) y está tipada como
`TaskPagination`.

### Rutas

| Ruta                          | Nombre          | Guard         |
| ----------------------------- | --------------- | ------------- |
| `/login`, `/register`         | `login`, `register` | `guestOnly` |
| `/`                           | `dashboard`     | `requiresAuth` |
| `/projects`                   | `projects`      | `requiresAuth` |
| `/projects/:projectId`        | `project-detail`| `requiresAuth` |
| `/projects/:projectId/tasks`  | `task-list`     | `requiresAuth` |
| `/projects/:projectId/tasks/:taskId` | `task-detail` | `requiresAuth` |
| `/:pathMatch(.*)*`            | `not-found`     | —             |

## Pruebas

```bash
npm run test:unit     # 94 pruebas en 16 archivos (Vitest + Vue Test Utils)
npm run test:e2e      # 93 pruebas (31 casos × 3 navegadores) con Playwright
```

Las pruebas E2E se ejecutan contra un doble de la API, por lo que **no necesitan backend
ni base de datos**. Consulta [`e2e/README.md`](e2e/README.md) para ejecutarlas contra el
backend real y para conocer los requisitos.

### Responsive

Se validan los viewports 1920×1080, 1366×768, 768×1024, 390×844 y 360×800 comprobando
que `documentElement.scrollWidth <= documentElement.clientWidth` en el panel, el listado y
el detalle de proyectos, el listado y el detalle de tareas y la pantalla de login.

- Por debajo de 900 px el menú lateral se convierte en drawer y el listado de proyectos
  pasa a vista de tarjetas.
- Las tablas de Element Plus hacen scroll horizontal **dentro de su contenedor**, sin
  provocar scroll horizontal en el documento.

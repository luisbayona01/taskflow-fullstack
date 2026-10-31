# TaskFlow Fullstack

Proyecto de prueba técnica para la gestión de tareas y proyectos.

## 🐳 Ejecución con Docker (recomendado)

El `docker-compose.yml` de la raíz levanta el stack completo (MySQL + API Laravel + SPA Vue + phpMyAdmin)
con una sola orden, sin instalar PHP, Node ni MySQL en el host.

### Requisitos

- Docker Engine 24 o superior con **Docker Compose v2** (`docker compose version`).
- ~2 GB de RAM libres para construir las imágenes.

### Arranque rápido

```bash
# 1. Construir las imágenes y levantar el stack en segundo plano
docker compose up -d --build

# 2. Seguir el arranque (migraciones y seed del backend)
docker compose logs -f backend

# 3. Abrir la SPA
#    http://localhost:4300
```

El arranque es **idempotente**: el backend espera a que MySQL esté saludable, aplica las
migraciones pendientes y sólo carga los datos de demostración si la tabla `users` está vacía.

### Arquitectura de contenedores

```
   navegador ──► :4300  taskflow-frontend (nginx)
                          │   ├─ /            → SPA estática (dist/)
                          │   └─ /api/*       → proxy a taskflow-backend-nginx
                          │
                          ▼
                 taskflow-backend-nginx (:80)  ── fastcgi ──►  taskflow-backend
                                                                            │
   phpMyAdmin ──► :4301  taskflow-phpmyadmin ─────────────────────────────┤
                                                                            ▼
                                                            taskflow-mysql (:3306)
                                                                base `taskflow`
```

### Servicios y puertos

| Servicio        | Imagen / build                              | Puerto host | Descripción |
| --------------- | ------------------------------------------- | ----------- | ----------- |
| `mysql`         | `mysql:8`                                   | `3307`      | Base de datos MySQL 8 (base `taskflow`, `root` / `root`). Definición heredada del contenedor MySQL del stack `linkhubpruebatecnica` y adaptada al esquema de TaskFlow. |
| `backend`       | `backend/Dockerfile` (`php:8.2-fpm`)         | —           | API Laravel 12. Espera a MySQL, genera su `.env`, aplica las migraciones y carga el `DemoSeeder` si la tabla `users` está vacía. |
| `backend-nginx` | `nginx:1.27-alpine`                          | `8010`      | Sirve `backend/public/` y enruta las peticiones PHP a PHP-FPM. |
| `frontend`      | `frontend/Dockerfile` (node → nginx)        | `4300`      | SPA compilada con `VITE_API_BASE_URL=/api`; su Nginx hace de proxy de `/api` hacia `backend-nginx` (mismo origen, sin CORS). |
| `phpmyadmin`    | `phpmyadmin:5`                              | `4301`      | Administración gráfica de MySQL. |

| URL                              | Servicio |
| -------------------------------- | -------- |
| http://localhost:4300            | SPA (frontend) |
| http://localhost:8010            | API Laravel (catálogo de rutas y Swagger UI en `/documentation`) |
| http://localhost:4301            | phpMyAdmin (base `taskflow`, `root` / `root`) |
| `127.0.0.1:3307`                 | MySQL (cliente nativo) |

### Datos de demostración

El `DemoSeeder` se ejecuta automáticamente la primera vez (sólo si la tabla `users` está vacía):

| Usuario       | Correo                | Contraseña |
| ------------- | --------------------- | ---------- |
| Ana Torres    | `ana@taskflow.test`   | `password` |
| Luis Ramírez  | `luis@taskflow.test`  | `password` |
| Sofía Herrera | `sofia@taskflow.test` | `password` |

Incluye 2 proyectos, 10 tareas y comentarios.

### Volúmenes y persistencia

| Volumen            | Contenedor            | Ruta                      | Contenido |
| ------------------ | --------------------- | ------------------------- | --------- |
| `mysql_data`       | `taskflow-mysql`      | `/var/lib/mysql`          | Datos de MySQL (base `taskflow`). |
| `backend_storage`  | `taskflow-backend`    | `/var/www/html/storage`   | `.env` generado (`storage/app/docker.env`), logs y cachés de Laravel. |

> `docker compose down` conserva ambos volúmenes; `docker compose down -v` los borra y obliga
> a volver a migrar y sembrar la base en el siguiente arranque.

### Variables de entorno del compose

El backend **no** monta un `.env` del host: el entrypoint genera uno dentro del contenedor a
partir de estas variables y lo persiste en el volumen.

| Variable                    | Valor                     | Descripción |
| --------------------------- | ------------------------- | ----------- |
| `APP_NAME`                  | `TaskFlow`                | Nombre de la aplicación. |
| `APP_ENV` / `APP_DEBUG`     | `production` / `false`    | Modo de ejecución. |
| `APP_URL`                   | `http://localhost:8010`   | URL pública de la API. |
| `DB_HOST` / `DB_PORT`       | `mysql` / `3306`          | Conexión interna al contenedor de MySQL. |
| `DB_DATABASE`               | `taskflow`                | Base de datos creada por MySQL. |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / `root`         | Credenciales de MySQL (demostración). |
| `SESSION_DRIVER`            | `file`                    | Sesiones en el volumen de storage. |
| `CACHE_STORE` / `QUEUE_CONNECTION` | `database` / `sync` | Caché en BD y colas síncronas. |
| `VITE_API_BASE_URL` (build) | `/api`                   | La SPA llama a la API en el mismo origen. |

### El archivo `docker-compose.yml`

```yaml
services:
  mysql:
    image: mysql:8
    container_name: taskflow-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: taskflow
    ports:
      - "3307:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p$${MYSQL_ROOT_PASSWORD}"]
      interval: 5s
      timeout: 5s
      retries: 20

  backend:
    build:
      context: ./backend
    container_name: taskflow-backend
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      APP_NAME: TaskFlow
      APP_ENV: production
      APP_DEBUG: "false"
      APP_URL: http://localhost:8010
      DB_CONNECTION: mysql
      DB_HOST: mysql
      DB_PORT: 3306
      DB_DATABASE: taskflow
      DB_USERNAME: root
      DB_PASSWORD: root
      SESSION_DRIVER: file
      CACHE_STORE: database
      QUEUE_CONNECTION: sync
      L5_SWAGGER_USE_ABSOLUTE_PATH: "false"
    volumes:
      - backend_storage:/var/www/html/storage

  backend-nginx:
    image: nginx:1.27-alpine
    container_name: taskflow-backend-nginx
    restart: unless-stopped
    depends_on:
      - backend
    volumes:
      - ./backend/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./backend/public:/var/www/html/public:ro
    ports:
      - "8010:80"

  frontend:
    build:
      context: ./frontend
      args:
        # La SPA llama a la API en el mismo origen: Nginx hace de proxy de
        # `/api` hacia `backend-nginx` (ver frontend/nginx.conf).
        VITE_API_BASE_URL: /api
    container_name: taskflow-frontend
    restart: unless-stopped
    depends_on:
      - backend-nginx
    ports:
      - "4300:80"

  phpmyadmin:
    image: phpmyadmin:5
    container_name: taskflow-phpmyadmin
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: root
      UPLOAD_LIMIT: 64M
    ports:
      - "4301:80"

volumes:
  mysql_data:
  backend_storage:
```

Los ficheros que lo hacen funcionar son:

| Fichero                    | Función |
| -------------------------- | ------- |
| `backend/Dockerfile`       | Build multi-stage: assets de Vite + PHP 8.2 FPM con `pdo_mysql`, `mbstring`, `xml`, `zip`, `bcmath` y `opcache`. |
| `backend/docker-entrypoint.sh` | Espera a MySQL, genera el `.env`, ejecuta `key:generate`, `migrate --force` y el seed condicional. |
| `backend/nginx.conf`       | Sirve `backend/public/` y enruta las peticiones PHP a PHP-FPM. |
| `frontend/Dockerfile`      | Build `npm ci` + `npm run build` y publicación en `nginx:1.27-alpine`. |
| `frontend/nginx.conf`      | Fallback de la SPA (`try_files … /index.html`) y proxy de `/api` hacia `backend-nginx`. |

### Comandos habituales

```bash
# Estado y logs
docker compose ps                                    # estado de los contenedores
docker compose logs -f backend                       # logs del backend (migraciones, seed)
docker compose logs -f frontend                      # logs del nginx de la SPA

# Reconstruir (sólo un servicio y sus dependencias)
docker compose up -d --build frontend                # recompilar la SPA
docker compose up -d --build backend                 # recompilar la API
docker compose restart backend                       # reiniciar sin reconstruir

# Ejecutar comandos dentro de los contenedores
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --class=DemoSeeder --force
docker compose exec -T mysql mysql -uroot -proot taskflow   # consola MySQL

# Parada
docker compose down                                  # parar (conserva los datos)
docker compose down -v                               # parar y borrar volúmenes (MySQL y .env del backend)
```

### Verificación del stack

```bash
# 1. La SPA responde
curl -I http://localhost:4300/                       # HTTP/1.1 200 OK

# 2. Login (devuelve token Sanctum)
curl -s -X POST http://localhost:8010/api/login \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"email":"ana@taskflow.test","password":"password"}'

# 3. Endpoint protegido sin token → 401 (no 500)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4300/api/projects

# 4. La API también se consume a través del proxy de la SPA (mismo origen)
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4300/api/projects
```

### Desarrollo con Docker

También se puede usar Docker sólo para la base de datos y trabajar en local:

```bash
# MySQL en Docker, backend con PHP local (backend/.env)
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=taskflow
DB_USERNAME=root
DB_PASSWORD=root
```

```bash
# Frontend con Vite local consumiendo la API en el mismo origen (evita CORS)
# frontend/.env
VITE_API_BASE_URL=/api
DEV_PROXY_TARGET=http://127.0.0.1:8010
```

> `DEV_PROXY_TARGET` sólo afecta al servidor de desarrollo de Vite (indica dónde está el
> backend); la imagen de Docker compila la SPA con `VITE_API_BASE_URL=/api` y usa su propio
> proxy Nginx. La suite de pruebas del backend se ejecuta en el host (`php artisan test`),
> porque la imagen se instala con `composer install --no-dev`.

### Resolución de problemas

| Síntoma | Solución |
| ------- | -------- |
| `port is already allocated` | Otro proceso usa 3307/8010/4300/4301: cambia el puerto del host en `docker-compose.yml` (p. ej. `"4302:80"`). |
| La SPA carga pero la API falla | Revisa `docker compose logs backend` (el entrypoint espera a MySQL) y `docker compose ps` (MySQL debe estar `healthy`). |
| Cambios en el `.env` del contenedor sin efecto | El `.env` se persiste en el volumen: edita `docker-compose.yml` y ejecuta `docker compose up -d --force-recreate backend`, o borra `storage/app/docker.env` dentro del contenedor. |
| Quiero empezar de cero | `docker compose down -v && docker compose up -d --build` (borra la base y vuelve a migrar y sembrar). |

> El `.env` del backend se genera dentro del contenedor y se persiste en el volumen `backend_storage`
> (`storage/app/docker.env`), de modo que la `APP_KEY` se conserva entre reinicios.
> Las credenciales incluidas son de demostración: no usarlas en producción.

## 🚀 Instalación y Configuración

### Backend (Laravel API)
1. Clonar el repositorio.
2. Instalar dependencias: `composer install`
3. Crear archivo de entorno: `cp .env.example .env`
4. Generar clave de aplicación: `php artisan key:generate`
5. Configurar la base de datos en el archivo `.env`.
6. Ejecutar migraciones y seeders: `php artisan migrate --seed`
7. Iniciar el servidor: `php artisan serve`

### Frontend (Vue 3)
1. Navegar a la carpeta del frontend.
2. Instalar dependencias: `npm install`
3. Configurar el archivo `.env` con la URL de la API.
4. Iniciar el servidor de desarrollo: `npm run dev`

## ⚙️ Variables de Entorno Necesarias

### Backend (`.env`)
- `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`: Configuración de base de datos.
- `QUEUE_CONNECTION`: Configurado como `database` o `redis` para el manejo de Jobs asíncronos.
- `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, etc.: Configuración para el envío de notificaciones.

### Frontend (`.env`)
- `VITE_API_BASE_URL`: URL base del servidor Laravel (ej. `http://localhost:8000/api`).

## 🧪 Ejecución de Pruebas
- **Backend**: Ejecutar `php artisan test` para correr las pruebas unitarias y de integración (125 pruebas). La [matriz de pruebas de la API](#-matriz-de-pruebas-de-la-api-parte-2) detalla qué se verifica en cada endpoint.
- **Frontend**: Ejecutar `npm run test:unit` para las pruebas de componentes y lógica (94 pruebas en 16 archivos) y `npm run test:e2e` para los flujos end-to-end con Playwright (31 casos × Chromium/Firefox/WebKit = 93 ejecuciones).

## 🛠 Decisiones Técnicas

### Arquitectura Desacoplada (Vue + Laravel API)
Se ha optado por separar completamente el Frontend del Backend, comunicándolos a través de una API RESTful en lugar de utilizar Inertia.js o Blade por las siguientes razones:

1. **Escalabilidad y Especialización**: Permite que el frontend y el backend evolucionen de forma independiente. Facilita la futura creación de aplicaciones móviles (iOS/Android) que consuman la misma API.
2. **Rendimiento (Client-Side Rendering)**: Al usar Vue 3 con Composition API, la carga de la interfaz es más fluida y se reduce la carga del servidor, ya que este solo entrega datos en formato JSON.
3. **Experiencia de Usuario (UX)**: Permite implementar patrones como *Optimistic UI* (actualizar la interfaz antes de recibir la confirmación del servidor) y un manejo de estados globales más robusto mediante Pinia.
4. **Estandarización**: Sigue el estándar de industria para aplicaciones modernas donde el backend actúa como un proveedor de servicios y el frontend como una aplicación autónoma.

### Otras Decisiones:
- **Eager Loading**: Implementado para solucionar el problema N+1 detectado en el análisis de código.
- **Form Requests y Policies**: Separación de la lógica de validación y autorización para mantener controladores delgados (*Skinny Controllers*).
- **Queues**: Implementación de Jobs para el envío de correos, evitando bloqueos en la respuesta HTTP.

## 📈 Posibles Mejoras (con más tiempo)
1. **Implementación de WebSockets**: Usar Laravel Echo y Pusher/Soketi para actualizaciones de tareas en tiempo real sin necesidad de refrescar.
2. **Caché**: Implementar Redis para cachear las consultas de proyectos más frecuentes y reducir la carga de la DB.
3. **CI/CD**: Configurar GitHub Actions para automatizar el despliegue y la ejecución de tests en cada Pull Request.
4. **Documentación API**: Ver [API DOCUMENTATION – SWAGGER](#api-documentation--swagger).
5. **Test Coverage**: Aumentar la cobertura de tests integrando TDD en todas las nuevas funcionalidades.

## API DOCUMENTATION – SWAGGER

### Tecnología utilizada
- **[DarkaOnLine/L5-Swagger](https://github.com/DarkaOnLine/l5-swagger)** `v11.2.2` (compatible con Laravel 12 y PHP 8.2).
- **[zircote/swagger-php](https://github.com/zircote/swagger-php)** `v7.0.0` para el escaneo de atributos OpenAPI 3.0 (`OpenApi\Attributes`).
- **Swagger UI 5.34.1** embebido por L5-Swagger.

La documentación se define con atributos PHP (`#[OA\Get]`, `#[OA\Post]`, `#[OA\Schema]`, …) sobre los controladores y sobre el registro central de esquemas `backend/app/OpenApi/ApiSchemas.php`.

### Proceso de instalación (ya realizado en el repositorio)
```bash
cd backend
composer require darkaonline/l5-swagger
php artisan vendor:publish --provider="L5Swagger\L5SwaggerServiceProvider"
php artisan l5-swagger:generate
```
La publicación genera `backend/config/l5-swagger.php` y `backend/resources/views/vendor/l5-swagger`.

### Comandos para generar y actualizar la documentación
```bash
cd backend

# Regenerar el documento OpenAPI (documentacion/api-docs.json)
php artisan l5-swagger:generate

# Validar que el JSON generado es correcto
php -r 'json_decode(file_get_contents("documentacion/api-docs.json")); echo json_last_error_msg(), PHP_EOL;'

# Ejecutar la suite de pruebas (incluye la validación de la documentación)
php artisan test
```
El archivo generado se encuentra en **`backend/documentacion/api-docs.json`** y está versionado en el repositorio, por lo que cualquier cambio en la API debe acompañado de una regeneración (`php artisan l5-swagger:generate`) antes del commit.

### URL de Swagger UI y rutas de la documentación
| Recurso | URL |
|---|---|
| **Índice de rutas de la API (ruta principal)** | **http://localhost:8000/** (HTML) o `http://localhost:8000/api` (JSON) |
| **Swagger UI (interfaz interactiva)** | **http://localhost:8000/documentation** (alias: `/swagger`) |
| Documento OpenAPI (JSON) | http://localhost:8000/docs |
| Assets de Swagger UI | http://localhost:8000/docs/asset/{asset} |
| Health check | http://localhost:8000/up |

> La **ruta raíz** (`/`) publica el catálogo completo de rutas del backend (método, URI, descripción, tags y si requiere autenticación Bearer) y enlaza con la documentación. Swagger UI se sirve desde `/documentation` y el JSON plano desde `/docs`.

El catálogo también está disponible en formato JSON (útil para scripts y clientes):
```bash
curl -H "Accept: application/json" http://localhost:8000/
```
Respuesta:
```json
{
  "name": "TaskFlow",
  "version": "1.0.0",
  "documentation": {
    "swagger_ui": "http://localhost:8000/documentation",
    "openapi_json": "http://localhost:8000/docs",
    "openapi_file": "backend/documentacion/api-docs.json",
    "health": "http://localhost:8000/up"
  },
  "total_routes": 22,
  "routes": [
    {
      "method": "GET",
      "uri": "/api/projects",
      "name": "projects.index",
      "action": "App\\Http\\Controllers\\Api\\ProjectController@index",
      "middleware": ["api", "auth:sanctum"],
      "summary": "List the projects of the authenticated user",
      "tags": ["Projects"]
    }
  ]
}
```

### Catálogo de rutas de la API

| Método | URI | Descripción | Auth |
|---|---|---|---|
| POST | `/api/register` | Registrar un usuario | Pública |
| POST | `/api/login` | Autenticarse y obtener token Sanctum | Pública |
| POST | `/api/logout` | Revocar el token actual | Bearer |
| GET | `/api/me` | Perfil del usuario autenticado | Bearer |
| GET | `/api/projects` | Listar proyectos del usuario | Bearer |
| POST | `/api/projects` | Crear proyecto | Bearer |
| GET | `/api/projects/{project}` | Detalle del proyecto | Bearer |
| PUT / PATCH | `/api/projects/{project}` | Actualizar proyecto (owner) | Bearer |
| DELETE | `/api/projects/{project}` | Eliminar proyecto (owner) | Bearer |
| GET | `/api/projects/{project}/members` | Listar miembros del proyecto | Bearer |
| POST | `/api/projects/{project}/members` | Agregar miembro al proyecto | Bearer |
| DELETE | `/api/projects/{project}/members/{user}` | Quitar miembro del proyecto | Bearer |
| GET | `/api/projects/{project}/stats` | Estadísticas del proyecto | Bearer |
| GET | `/api/projects/{project}/tasks` | Listar, filtrar, ordenar y paginar tareas | Bearer |
| POST | `/api/projects/{project}/tasks` | Crear tarea | Bearer |
| GET | `/api/projects/{project}/tasks/{task}` | Detalle de una tarea | Bearer |
| PUT / PATCH | `/api/projects/{project}/tasks/{task}` | Actualizar tarea | Bearer |
| DELETE | `/api/projects/{project}/tasks/{task}` | Eliminar tarea | Bearer |
| GET | `/api/projects/{project}/tasks/{task}/comments` | Listar comentarios (más recientes primero) | Bearer |
| POST | `/api/projects/{project}/tasks/{task}/comments` | Publicar comentario | Bearer |

> **22 operaciones REST** en total (las combinaciones `PUT|PATCH` comparten la misma acción). El listado se mantiene sincronizado automáticamente con `php artisan route:list`.

## 🧪 MATRIZ DE PRUEBAS DE LA API (Parte 2)

Esta es la lista de endpoints que la prueba técnica pide verificar y los casos que deben probarse en cada uno. **Todos estos casos están implementados en la suite** (`backend/tests/Feature/`), que se ejecuta con `php artisan test`.

### Autenticación (`tests/Feature/Auth/AuthenticationTest.php`)
| Endpoint | Casos a probar | Código esperado |
|---|---|---|
| `POST /api/register` | Registro válido devuelve token y usuario | `201` |
| | Validación: name/email/password requeridos, email único, password ≥ 8 y confirmado | `422` |
| `POST /api/login` | Credenciales válidas devuelven token Sanctum | `200` |
| | Credenciales inválidas (no revela si el email existe) | `401` |
| | Rate limiting por IP | `429` |
| `POST /api/logout` | Revoca únicamente el token actual | `200` |
| `GET /api/me` | Perfil del usuario autenticado | `200` |
| | Sin token / token inválido | `401` |

### Proyectos (`tests/Feature/Api/ProjectApiTest.php`, `ProjectMemberApiTest.php`)
| Endpoint | Casos a probar | Código esperado |
|---|---|---|
| `GET /api/projects` | Solo los proyectos del usuario (owner o miembro) | `200` |
| | Sin autenticar | `401` |
| `POST /api/projects` | El owner se registra en la pivote con rol `owner` | `201` |
| | Datos inválidos | `422` |
| `GET /api/projects/{project}` | Miembro ve el detalle con owner y miembros | `200` |
| | No miembro (IDOR) | `403` |
| | Proyecto inexistente | `404` |
| `PUT/PATCH /api/projects/{project}` | Solo el owner actualiza | `200` |
| | Miembro no owner | `403` |
| `DELETE /api/projects/{project}` | Solo el owner elimina (soft delete) | `204` |
| `GET /api/projects/{project}/members` | Miembro lista miembros | `200` |
| | No miembro | `403` |
| `POST /api/projects/{project}/members` | Owner agrega miembro | `201` |
| | No owner | `403` |
| | Usuario inexistente o ya miembro | `422` |
| `DELETE /api/projects/{project}/members/{user}` | Owner quita miembro | `204` |
| | No owner | `403` |
| | Usuario no miembro | `404` |
| | El owner no puede ser removido | `422` |

### Tareas (`tests/Feature/Api/TaskApiTest.php`, `TaskFilteringApiTest.php`)
| Endpoint | Casos a probar | Código esperado |
|---|---|---|
| `GET /api/projects/{project}/tasks` | Listado paginado con filtros `status`, `priority`, `assigned_to`, `due_date_from/to`, búsqueda `search`, `sort_by`, `sort_direction`, `per_page` | `200` |
| | No miembro | `403` |
| `POST /api/projects/{project}/tasks` | Cualquier miembro crea tareas | `201` |
| | `title` requerido, enums y `due_date` válidos | `422` |
| | Asignar a un usuario que **no** es miembro | `422` |
| `GET /api/projects/{project}/tasks/{task}` | Miembro consulta el detalle | `200` |
| | Tarea de otro proyecto / inexistente | `404` |
| `PUT/PATCH /api/projects/{project}/tasks/{task}` | Miembro actualiza la tarea | `200` |
| | Asignar a un no miembro | `422` |
| `DELETE /api/projects/{project}/tasks/{task}` | Miembro elimina la tarea | `204` |

### Comentarios (`tests/Feature/Api/CommentApiTest.php`)
| Endpoint | Casos a probar | Código esperado |
|---|---|---|
| `GET /api/projects/{project}/tasks/{task}/comments` | Listado paginado (15 por página), del más reciente al más antiguo, con autor | `200` |
| | No miembro | `403` |
| | Tarea de otro proyecto | `404` |
| `POST /api/projects/{project}/tasks/{task}/comments` | Miembro publica (autor = usuario autenticado, tarea = URL) | `201` |
| | `body` obligatorio | `422` |
| | No miembro | `403` |

### Estadísticas (`tests/Feature/Api/ProjectStatsApiTest.php`)
| Endpoint | Casos a probar | Código esperado |
|---|---|---|
| `GET /api/projects/{project}/stats` | Proyecto sin tareas → todos los contadores en 0 y avance `0` | `200` |
| | Totales por estado (`pending`, `in_progress`, `done`) | `200` |
| | Vencidas = `due_date` anterior y estado ≠ `done` | `200` |
| | Las completadas no cuentan como vencidas | `200` |
| | Porcentaje redondeado a 2 decimales (1/3 → `33.33`) | `200` |
| | No miembro | `403` |
| | Sin autenticar | `401` |

### Notificaciones (`tests/Feature/Api/TaskNotificationTest.php`)
| Caso | Resultado esperado | Código esperado |
|---|---|---|
| Crear tarea con `assigned_to` | Notificación al asignado (`Notification::fake()`) | `201` |
| Cambiar el `assigned_to` | Notificación **solo** al nuevo asignado | `200` |
| Mantener el mismo asignado | Sin notificación | `200` |
| `assigned_to = null` | Sin notificación | `200` |
| Crear tarea sin asignado | Sin notificación | `201` |
| Clase de la notificación | Implementa `ShouldQueue` y `ShouldQueueAfterCommit` | — |
| Contenido del correo | Proyecto, tarea, descripción (si existe), prioridad, fecha límite (si existe) y asignador | — |

### Contrato transversal (`tests/Feature/Api/ApiContractTest.php`)
| Caso | Resultado esperado |
|---|---|
| Los 20 endpoints protegidos sin token | `401` con `{"success": false}` |
| Endpoint protegido sin cabecera `Accept: application/json` | `401` (no `500` por la redirección a una ruta `login` inexistente) |
| Proyecto o tarea inexistente | `404` con el mismo envoltorio |
| Tarea perteneciente a otro proyecto | `404` |
| Errores de validación (create y update) | `422` con los nombres de los campos |
| Borrados | `204` sin cuerpo |
| No miembro en endpoints con alcance de proyecto | `403` |
| Listado de tareas sin N+1 | El número de queries no crece con el número de tareas |
| Detalle de proyecto sin N+1 | Queries acotadas (owner y miembros eager loaded) |

### Comandos
```bash
cd backend
php artisan test                                    # suite completa (125 pruebas)
php artisan test --filter=ApiContractTest           # contrato HTTP
php artisan test --filter=TaskNotificationTest      # notificaciones
php artisan test --filter=TaskFilteringApiTest      # filtros y paginación
```

### Autenticación con Sanctum
1. Obtener un token con `POST /api/login` (o `POST /api/register`).
2. En Swagger UI, pulsar el botón **Authorize**.
3. Pegar el token **sin** el prefijo `Bearer` (el esquema HTTP Bearer lo añade automáticamente) y pulsar *Authorize*.
4. Ejecutar cualquier endpoint protegido: la cabecera `Authorization: Bearer <token>` se enviará automáticamente.

No se incluyen tokens ni credenciales reales en la documentación.

### Cómo probar los endpoints
1. Arrancar el backend: `cd backend && php artisan serve`.
2. Abrir http://localhost:8000/ para ver el índice de rutas (o http://localhost:8000/documentation para Swagger UI).
3. Autorizar el token (ver sección anterior).
4. Expandir el grupo de tags (Authentication, Projects, Tasks, Comments) y pulsar **Try it out** → **Execute**.

Las respuestas de ejemplo de la documentación reflejan los `API Resources` reales (`UserResource`, `ProjectResource`, `TaskResource`, `CommentResource`) y el envoltorio estándar `success / message / data` de `App\Support\ApiResponse`.

### Endpoints documentados
| Tag | Endpoints |
|---|---|
| Authentication | `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET /api/me` |
| Projects | `GET/POST /api/projects`, `GET/PUT/PATCH/DELETE /api/projects/{project}`, `GET/POST /api/projects/{project}/members`, `DELETE /api/projects/{project}/members/{user}`, `GET /api/projects/{project}/stats` |
| Tasks | `GET/POST /api/projects/{project}/tasks`, `GET/PUT/PATCH/DELETE /api/projects/{project}/tasks/{task}` (con filtros `status`, `priority`, `assigned_to`, `due_date_from`, `due_date_to`, `search`, `sort_by`, `sort_direction`, `per_page`) |
| Comments | `GET/POST /api/projects/{project}/tasks/{task}/comments` |

### Cómo actualizar la documentación después de modificar la API
1. Añadir/ajustar los atributos `OpenApi\Attributes` en el controlador afectado.
2. Añadir o modificar el esquema correspondiente en `backend/app/OpenApi/ApiSchemas.php`.
3. Regenerar el documento: `php artisan l5-swagger:generate`.
4. Verificar que no haya referencias rotas ni rutas sin documentar: `php artisan test --filter=OpenApiDocumentationTest`.
5. Commitear el código **y** el archivo `backend/documentacion/api-docs.json` regenerado.

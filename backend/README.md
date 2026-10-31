# TaskFlow API (Laravel 12)

API REST de TaskFlow para la gestión de proyectos, tareas, comentarios y estadísticas.

## Requisitos

- PHP 8.2+
- Composer 2
- SQLite (por defecto) o MySQL/PostgreSQL

## Instalación

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

La API queda disponible en `http://localhost:8000/api`.

## Ejecución con Docker

El backend forma parte del `docker-compose.yml` de la raíz del repositorio:

```bash
docker compose up -d --build      # levanta MySQL + backend + nginx + frontend
docker compose logs -f backend    # logs (migraciones, seed)
docker compose down               # parar conservando los datos
```

| Contenedor      | Puerto host | Descripción |
| --------------- | ----------- | ----------- |
| `taskflow-backend`       | —    | PHP-FPM 8.2 con la aplicación. Espera a MySQL, genera su `.env`, aplica `migrate --force` y ejecuta `DemoSeeder` si la tabla `users` está vacía. |
| `taskflow-backend-nginx` | `8010` | Nginx que sirve `public/` y enruta PHP a PHP-FPM. |

La API queda disponible en `http://localhost:8010/api` y Swagger UI en
`http://localhost:8010/documentation`. El `.env` del contenedor se genera solo y se
persiste en el volumen `backend_storage` (`storage/app/docker.env`), de forma que la
`APP_KEY` se conserva entre reinicios.

## Variables de entorno relevantes

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DB_CONNECTION` | `sqlite` | Conexión de base de datos. |
| `QUEUE_CONNECTION` | `database` | Cola usada por las notificaciones (requiere `php artisan queue:work`). |
| `MAIL_MAILER` | `log` | En desarrollo los correos se escriben en `storage/logs/laravel.log`. |
| `L5_SWAGGER_GENERATE_ALWAYS` | `true` | Regenera el documento OpenAPI al abrir Swagger UI. |
| `L5_FORMAT_TO_USE_FOR_DOCS` | `json` | Formato del documento servido por Swagger UI. |

## Pruebas

```bash
php artisan test
```

La suite (125 pruebas) incluye la validación automática de la documentación OpenAPI
(`tests/Feature/OpenApiDocumentationTest.php`): comprueba que el JSON es válido,
que todas las rutas de la API están documentadas, que los endpoints protegidos
usan el esquema Bearer y que no existen referencias rotas.

| Archivo | Cobertura |
|---|---|
| `tests/Feature/Auth/AuthenticationTest.php` | Registro, login, logout, `me`, rate limiting, token inválido. |
| `tests/Feature/Api/ProjectApiTest.php` | CRUD de proyectos, soft delete, visibilidad por membresía. |
| `tests/Feature/Api/ProjectMemberApiTest.php` | Alta/baja de miembros, owner vs miembro, casos 403/404/422. |
| `tests/Feature/Api/TaskApiTest.php` | CRUD de tareas, asignación a miembros, 404 de proyecto ajeno. |
| `tests/Feature/Api/TaskFilteringApiTest.php` | Filtros, búsqueda, ordenamiento y paginación. |
| `tests/Feature/Api/CommentApiTest.php` | Crear/listar comentarios, autor, paginación y autorización. |
| `tests/Feature/Api/ProjectStatsApiTest.php` | Totales por estado, vencidas, porcentaje y 403/401. |
| `tests/Feature/Api/TaskNotificationTest.php` | Notificación en cola al asignar, con `Notification::fake()`. |
| `tests/Feature/Api/ApiContractTest.php` | Contrato HTTP: 401/403/404/422/204 y ausencia de N+1. |
| `tests/Feature/OpenApiDocumentationTest.php` | Sincronización de la documentación con las rutas reales. |

## API DOCUMENTATION – SWAGGER

- **Tecnología**: `darkaonline/l5-swagger` 11.2.2 + `zircote/swagger-php` 7.0.0 (OpenAPI 3.0).
- **Definición**: atributos `OpenApi\Attributes` sobre los controladores y esquemas
  centralizados en `app/OpenApi/ApiSchemas.php`.
- **Índice de rutas (ruta principal)**: http://localhost:8000/ (HTML) y http://localhost:8000/api (JSON).
- **Swagger UI**: http://localhost:8000/documentation (alias `/swagger`).
- **Documento OpenAPI**: http://localhost:8000/docs y archivo versionado `documentacion/api-docs.json`.

### Rutas del backend

| Método | URI | Descripción | Auth |
|---|---|---|---|
| GET | `/` | Índice de rutas de la API (HTML) | Pública |
| GET | `/api` | Índice de rutas de la API (JSON) | Pública |
| GET | `/documentation` | Swagger UI | Pública |
| GET | `/docs` | Documento OpenAPI (JSON) | Pública |
| GET | `/up` | Health check | Pública |
| POST | `/api/register` | Registrar usuario | Pública |
| POST | `/api/login` | Login y token Sanctum | Pública |
| POST | `/api/logout` | Revocar token | Bearer |
| GET | `/api/me` | Perfil del usuario | Bearer |
| GET / POST | `/api/projects` | Listar / crear proyectos | Bearer |
| GET / PUT / PATCH / DELETE | `/api/projects/{project}` | Detalle / actualizar / eliminar proyecto | Bearer |
| GET / POST | `/api/projects/{project}/members` | Listar / agregar miembros | Bearer |
| DELETE | `/api/projects/{project}/members/{user}` | Quitar miembro | Bearer |
| GET | `/api/projects/{project}/stats` | Estadísticas del proyecto | Bearer |
| GET / POST | `/api/projects/{project}/tasks` | Listar (con filtros) / crear tareas | Bearer |
| GET / PUT / PATCH / DELETE | `/api/projects/{project}/tasks/{task}` | Detalle / actualizar / eliminar tarea | Bearer |
| GET / POST | `/api/projects/{project}/tasks/{task}/comments` | Listar / crear comentarios | Bearer |

### Comandos

```bash
# Regenerar el documento OpenAPI
php artisan l5-swagger:generate

# Validar el JSON generado
php -r 'json_decode(file_get_contents("documentacion/api-docs.json")); echo json_last_error_msg(), PHP_EOL;'

# Comprobar que la documentación está sincronizada
php artisan test --filter=OpenApiDocumentationTest
```

### Autenticación

1. `POST /api/login` (o `/api/register`) para obtener el token de Sanctum.
2. En Swagger UI, botón **Authorize** → pegar el token sin el prefijo `Bearer`.
3. Ejecutar los endpoints protegidos: la cabecera `Authorization: Bearer <token>` se envía sola.

### Actualizar la documentación

1. Actualizar los atributos OpenAPI del controlador y/o `app/OpenApi/ApiSchemas.php`.
2. `php artisan l5-swagger:generate`.
3. `php artisan test --filter=OpenApiDocumentationTest`.
4. Versionar el código junto con `documentacion/api-docs.json`.

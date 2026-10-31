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

La suite incluye la validación automática de la documentación OpenAPI
(`tests/Feature/OpenApiDocumentationTest.php`): comprueba que el JSON es válido,
que todas las rutas de la API están documentadas, que los endpoints protegidos
usan el esquema Bearer y que no existen referencias rotas.

## API DOCUMENTATION – SWAGGER

- **Tecnología**: `darkaonline/l5-swagger` 11.2.2 + `zircote/swagger-php` 7.0.0 (OpenAPI 3.0).
- **Definición**: atributos `OpenApi\Attributes` sobre los controladores y esquemas
  centralizados en `app/OpenApi/ApiSchemas.php`.
- **Swagger UI**: http://localhost:8000/ (ruta raíz, configurada en `config/l5-swagger.php`).
- **Documento OpenAPI**: http://localhost:8000/docs y archivo versionado `documentacion/api-docs.json`.

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

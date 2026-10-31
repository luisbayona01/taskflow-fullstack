# TaskFlow Fullstack

Proyecto de prueba técnica para la gestión de tareas y proyectos.

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
- **Backend**: Ejecutar `php artisan test` para correr las pruebas unitarias y de integración.
- **Frontend**: Ejecutar `npm run test:unit` para las pruebas de componentes y lógica.

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
4. **Documentación API**: Generar documentación interactiva utilizando Swagger/L5-Swagger.
5. **Test Coverage**: Aumentar la cobertura de tests integrando TDD en todas las nuevas funcionalidades.

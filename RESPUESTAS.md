# RESPUESTAS – PRUEBA TÉCNICA

## PARTE 1: Conceptos Teóricos

### 1. Problema N+1 en Eloquent
Ocurre cuando se consulta una lista de registros y, por cada registro, se ejecuta otra consulta para obtener una relación. Por ejemplo, listar 100 tareas y acceder a `$task->assignee` puede generar 1 consulta para las tareas y hasta 100 consultas para los asignados. Lo detectaría con Laravel Debugbar, Telescope o el registro de consultas. Se corrige usando eager loading (`Task::with('assignee')->get()`) y, cuando corresponda, `load()` para cargar relaciones después. También se pueden usar `withCount()` para contar relaciones sin recorrerlas individualmente.

### 2. Form Request, Policy y Middleware
- **Form Request**: Valida los datos de entrada (reglas, mensajes y autorización básica de la petición).
- **Policy**: Decide si un usuario puede realizar una acción sobre un recurso concreto, por ejemplo actualizar una tarea o eliminar un proyecto.
- **Middleware**: Aplica controles transversales antes de llegar al controlador, como autenticación, verificación de roles, rate limiting o permisos generales.
Así, la validación queda en el Request, los permisos del recurso en la Policy y los controles generales en Middleware.

### 3. Service Container y Service Providers
El **Service Container** es el mecanismo de Laravel que resuelve clases y sus dependencias mediante inyección de dependencias. Los **Service Providers** son el lugar donde se registran servicios, bindings y configuraciones para que estén disponibles en la aplicación. Por ejemplo, definir una interfaz `NotificationSender` y enlazarla con `MailNotificationSender` en un provider permite que un controlador o servicio reciba la interfaz por constructor sin depender de una implementación concreta. Esto facilita pruebas y cambiar el proveedor de notificaciones.

### 4. Jobs en cola y fallos
Usaría una Job con `ShouldQueue` para tareas lentas o que no necesitan terminar dentro de la petición HTTP, como enviar correos, generar reportes o procesar archivos. El controlador despacha la Job y responde más rápido. Si falla, Laravel puede reintentarla según `tries`, `backoff` y configuración del worker; al agotar los intentos queda registrada en `failed_jobs` y puede inspeccionarse o reintentarse con `artisan queue:retry`. La operación debe diseñarse para ser idempotente y evitar duplicados en los reintentos.

### 5. Transacciones y concurrencia al descontar stock
`DB::transaction()` agrupa la creación del pedido, sus ítems y el descuento de inventario: si una operación falla, se revierte todo. Para evitar que dos compras simultáneas lean el mismo stock disponible, bloquearía la fila del producto con `lockForUpdate()` dentro de la transacción y volvería a validar que exista stock suficiente antes de descontarlo. También se puede usar una actualización condicional atómica (`where stock >= cantidad`) y comprobar las filas afectadas.

### 6. ref, reactive, computed y watch
- **ref**: Crea una referencia reactiva y se usa habitualmente para valores primitivos u objetos; se accede a su valor mediante `.value` en JavaScript.
- **reactive**: Convierte un objeto en un proxy reactivo.
- **computed**: Define un valor derivado que se recalcula cuando cambian sus dependencias y se cachea.
- **watch**: Ejecuta un efecto cuando cambia una fuente observada. Es adecuado para efectos secundarios (ej. llamar a una API cuando cambia un filtro de búsqueda).

### 7. Comunicación entre componentes y Pinia
- **Padre a hijo**: props.
- **Hijo a padre**: eventos emitidos (`defineEmits`).
- **Entre hermanos**: el padre común recibe el evento y pasa el dato al otro hijo.
- **Componentes lejanos**: `provide/inject` o estado global con **Pinia**. Pinia se justifica cuando varios componentes necesitan compartir estado y acciones (ej. sesión de usuario, permisos). No hace falta para estado local de un formulario.

### 8. Composable y firma de useFetch
Un composable es una función que encapsula y reutiliza lógica reactiva de Vue usando Composition API.
**Firma en TypeScript:**
`function useFetch<T>(url: MaybeRefOrGetter<string>): { data: Ref<T | null>; loading: Ref<boolean>; error: Ref<Error | null> }`
La implementación usaría `ref` para el estado, `watch` para ejecutar la petición al cambiar la URL y manejaría la cancelación de peticiones anteriores.

### 9. Índices para tasks
Como el filtro principal es `project_id`, seguido de `status`, y luego se ordena por `due_date`, evaluaría un índice compuesto: `(project_id, status, due_date)`. El orden importa para que el motor acote primero el proyecto, luego el estado y finalmente optimice el ordenamiento. Validaría el resultado con `EXPLAIN`.

### 10. SQL injection, XSS, CSRF y mass assignment
- **SQL Injection**: Laravel usa consultas parametrizadas. El riesgo aparece al usar `DB::raw` con concatenación.
- **XSS**: Blade y Vue escapan el texto por defecto. `v-html` o `{!! !!}` son peligrosos si el contenido no es confiable.
- **CSRF**: Laravel valida tokens en peticiones web con sesión.
- **Mass Assignment**: Se controla con `$fillable` o `$guarded`. Se debe usar `validated()` en lugar de `$request->all()`.

---

## PARTE 4: CODE REVIEW

### Fragmento A – Controlador Laravel
1. **SQL injection**: `whereRaw` concatena directamente. Debe usarse `where('title', 'like', '%' . $search . '%')`.
2. **Validación**: Falta validar `project_id` y `search`. Se recomienda un Form Request.
3. **Autorización**: No se comprueba que el usuario sea miembro del proyecto (Riesgo de IDOR). Aplicar Policy.
4. **Problema N+1**: Acceso a `$task->assignee` en loop. Usar `Task::with('assignee')`.
5. **Null Safety**: `assignee` puede ser null. Evitar acceso directo a `->name`.
6. **Paginación**: `get()` puede saturar la memoria. Usar `paginate()`.
7. **API Resources**: Se devuelven modelos Eloquent directamente. Usar `JsonResource`.
8. **Manejo de Errores**: `Task::find($id)` puede devolver null. Usar `findOrFail()`.
9. **Mass Assignment**: `$request->all()` es peligroso. Usar `$request->validated()`.
10. **Integridad**: No se valida que `assigned_to` pertenezca al proyecto.
11. **Performance**: `Mail::send` es síncrono. Usar `ShouldQueue`.
12. **Null Check**: No se comprueba existencia de asignado antes de enviar mail.
13. **Lógica de Notificación**: Se envía mail en cada update aunque el asignado no cambie.
14. **HTTP Status**: Siempre devuelve 200. Usar 204, 403, 404 o 422 según el caso.

### Fragmento B – Componente Vue
1. **Hardcoded URL**: `localhost` rompe en producción. Usar variables de entorno y Axios `baseURL`.
2. **Query Params**: Concatenación manual de URL. Usar objeto `params` de Axios.
3. **Debounce**: Petición por cada tecla. Implementar debounce de 300ms.
4. **UX**: No hay estados de `loading`, `error` o lista vacía.
5. **Auth**: No hay interceptores para tokens ni manejo de 401.
6. **Race Conditions**: Peticiones antiguas pueden sobrescribir nuevas. Usar `AbortController`.
7. **Inmutabilidad**: `props.projectId = null` es incorrecto. Las props son read-only.
8. **Optimistic UI**: `markDone` cambia el estado antes de la API sin revertir en fallo.
9. **Error Handling**: Falta `try/catch` en `axios.put`.
10. **Payload**: Se envía la tarea completa. Enviar solo campos necesarios.
11. **XSS**: `v-html` es peligroso. Usar `{{ task.title }}`.
12. **Vue Keys**: `v-for` sin `:key`.
13. **Endpoint**: `/api/tasks` no coincide con el contrato `/api/projects/{project}/tasks`.
14. **Lifecycle**: El watcher no carga datos al inicio. Usar `{ immediate: true }`.
15. **Reactividad**: No reacciona a cambios de `projectId`.

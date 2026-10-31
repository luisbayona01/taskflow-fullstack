# Pruebas E2E de TaskFlow

Suite de **Playwright** que cubre los flujos principales de la SPA y el comportamiento
responsive en los cinco viewports exigidos.

```bash
# Instalar los navegadores (solo la primera vez)
npx playwright install

# Ejecutar toda la suite (Chromium, Firefox y WebKit)
npm run test:e2e

# Un solo navegador o un solo archivo
npm run test:e2e -- --project=chromium
npm run test:e2e -- e2e/flows.spec.ts

# Modo depuración
npm run test:e2e -- --debug
```

El servidor de desarrollo (`npm run dev`) se levanta automáticamente en
`http://localhost:5173`. Con `CI=true` se usa la build de producción
(`npm run build` + `npm run preview` en `http://localhost:4173`).

## Archivos

| Archivo               | Cobertura                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `flows.spec.ts`       | Los 9 flujos pedidos: login, panel, proyectos, crear proyecto, crear tarea, filtrar tareas, detalle, comentar y cerrar sesión. |
| `projects.spec.ts`    | Listado, búsqueda, alta, borrado con confirmación, permisos por rol y detalle.                                                 |
| `vue.spec.ts`         | Guards de ruta, navegación a registro, drawer móvil y respuesta 401.                                                           |
| `responsive.spec.ts`  | Scroll horizontal en 1920×1080, 1366×768, 768×1024, 390×844 y 360×800.                                                         |
| `helpers/mock-api.ts` | Doble de la API REST (estado en memoria) usado por todas las specs.                                                            |

## Cómo funcionan: API simulada

Por defecto **todas** las peticiones a `**/api/**` se interceptan con
`page.route()` y se resuelven con `helpers/mock-api.ts`, que reproduce las formas reales
de respuesta del backend Laravel verificadas en `backend/routes/api.php`:

- `{ success, message, data }` en la mayoría de endpoints.
- `{ data }` en `GET /projects/{id}/stats`.
- `JsonResource` en comentarios: `{ data, links, meta }` para la colección y `{ data }`
  para el alta.
- Paginación de tareas como objeto propio (`total`, `per_page`, `current_page`, …).

El doble mantiene estado (proyectos, tareas, comentarios), de modo que los flujos pueden
crear recursos y comprobar que el listado se actualiza. Además registra cada petición,
por lo que las specs pueden verificar método, URL, query params y payload.

```ts
const api = await mockApi(page)

await page.goto('/projects/10/tasks')
await page.getByRole('button', { name: 'Aplicar' }).click()

expect(api.last('GET', '/projects/10/tasks')?.query.status).toBe('done')
```

Ventajas: la suite es rápida, determinista y **no depende de que haya un backend en
marcha** (de hecho, si el backend real respondiera con un `401` a una petición no
simulada, la aplicación cerraría la sesión y las pruebas fallarían).

## Ejecutar contra el backend real

Para validar la integración real (no la simulada) hay que:

1. **Base de datos**: MySQL con la base `taskflow_testing` (la que usa `phpunit.xml`).

   ```bash
   mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS taskflow_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. **Migraciones y datos de prueba** (en el backend):

   ```bash
   cd ../backend
   php artisan migrate --env=testing
   php artisan db:seed --class=DemoSeeder --env=testing
   ```

   El `DemoSeeder` crea los usuarios `ana@taskflow.test`, `luis@taskflow.test` y
   `sofia@taskflow.test` (contraseña `password`), dos proyectos, tareas y comentarios.

3. **Servidor de la API**:

   ```bash
   cd ../backend
   php artisan serve --host=127.0.0.1 --port=8000
   ```

4. **Frontend apuntando a la API real**: deja `VITE_API_BASE_URL` con la URL del backend
   (por ejemplo `http://127.0.0.1:8000/api`) y arranca `npm run dev`.

5. **Adaptar las specs**: las specs actuales instalan el doble de la API, así que para
   golpear el backend real hay que eliminar (o condicionar) la llamada a `mockApi(page)`
   en `beforeEach` y usar las credenciales reales en el flujo de login.

   ```ts
   // e2e/flows.spec.ts (extracto)
   test('inicia sesión con credenciales válidas', async ({ page }) => {
     // Sin mock: se usa el backend real.
     await page.goto('/login')
     await page.getByPlaceholder('tu@correo.com').fill('ana@taskflow.test')
     await page.getByPlaceholder('••••••••').fill('password')
     await page.getByRole('button', { name: 'Entrar' }).click()
     await expect(page).toHaveURL(/\/$/)
   })
   ```

6. **Requisito de CORS**: el backend debe permitir el origen del frontend
   (`http://localhost:5173`). En local, la configuración por defecto de Laravel
   (`vendor/laravel/framework/config/cors.php`) responde `Access-Control-Allow-Origin: *`;
   si se restringe, hay que incluir ese origen en la configuración CORS del backend.

> Nota: contra el backend real los identificadores de proyecto y tarea no son fijos
> (`10`, `100`). Las aserciones que dependen de un id concreto deben resolverse a partir
> de los datos leídos (por ejemplo, haciendo clic en la primera fila del listado) en lugar
> de fijarlos en el test.

## Notas

- Con el servidor de desarrollo de Vite, WebKit puede mostrar un aviso
  `Importing a module script failed` durante la **primera** carga: es la recarga que hace
  Vite al optimizar dependencias por primera vez. No aparece al usar el servidor de
  producción (`npm run preview`, que es lo que hace `CI=true`).
- Las trazas y capturas de los fallos se guardan en `test-results/`.

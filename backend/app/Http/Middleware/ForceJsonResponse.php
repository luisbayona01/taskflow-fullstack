<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fuerza que las peticiones de la API se resuelvan siempre en JSON.
 *
 * Cuando una petición no espera JSON, Laravel redirige a la ruta `login`
 * (ver `Illuminate\Foundation\Exceptions\Handler::unauthenticated()`). Esa ruta
 * no existe en una API pura, por lo que una petición sin la cabecera
 * `Accept: application/json` terminaba en un 500 en lugar del 401 que el
 * cliente necesita para cerrar la sesión.
 */
class ForceJsonResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->wantsJson()) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}

<?php

use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // La API sólo devuelve JSON: sin esa cabecera, Laravel intentaría
        // redirigir a una ruta `login` que no existe y devolvería un 500 en
        // lugar del 401 esperado por el cliente.
        $middleware->api(prepend: [\App\Http\Middleware\ForceJsonResponse::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    $exception->getMessage() ?: 'Unauthenticated.',
                    null,
                    401
                );
            }
        });

        $exceptions->render(function (AuthorizationException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    'This action is unauthorized.',
                    null,
                    403
                );
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    'This action is unauthorized.',
                    null,
                    403
                );
            }
        });

        $exceptions->render(function (ModelNotFoundException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    'The requested resource was not found.',
                    null,
                    404
                );
            }
        });

        $exceptions->render(function (NotFoundHttpException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    'The requested endpoint or resource was not found.',
                    null,
                    404
                );
            }
        });

        $exceptions->render(function (ValidationException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    'The given data was invalid.',
                    $exception->errors(),
                    422
                );
            }
        });

        $exceptions->render(function (ThrottleRequestsException $exception, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error(
                    $exception->getMessage(),
                    null,
                    429
                )->withHeaders($exception->getHeaders());
            }
        });

        // Last registered callback: any other error is returned as a clean
        // JSON envelope without stack traces or internal file paths.
        $exceptions->render(function (Throwable $exception, Request $request) {
            if ($request->is('api/*')) {
                $message = config('app.debug')
                    ? $exception->getMessage()
                    : 'An unexpected error occurred.';

                return ApiResponse::error($message, null, 500);
            }
        });
    })->create();

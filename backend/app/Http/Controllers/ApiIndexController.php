<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;

/**
 * Exposes the catalogue of routes of the API in the main path of the backend ("/").
 *
 * The response is content negotiated:
 *  - JSON  (Accept: application/json) -> machine readable catalogue.
 *  - HTML  (default)                   -> human friendly index with the Swagger UI link.
 */
class ApiIndexController extends Controller
{
    /**
     * HTTP methods that are exposed as REST operations.
     *
     * @var list<string>
     */
    private const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    public function index(Request $request): Response|JsonResponse
    {
        $routes = $this->apiRoutes();

        if ($request->wantsJson() || $request->query('format') === 'json') {
            return response()->json([
                'name' => config('app.name'),
                'version' => '1.0.0',
                'documentation' => $this->documentationLinks(),
                'total_routes' => count($routes),
                'routes' => $routes,
            ]);
        }

        return response()->view('api-index', [
            'routes' => $routes,
            'documentation' => $this->documentationLinks(),
        ]);
    }

    /**
     * Catalogue of the REST routes of the API enriched with the information
     * of the generated OpenAPI document (summary and tags).
     *
     * @return list<array<string, mixed>>
     */
    private function apiRoutes(): array
    {
        $operations = $this->openApiOperations();

        $routes = [];

        foreach (RouteFacade::getRoutes() as $route) {
            if (! $this->isApiRoute($route)) {
                continue;
            }

            $path = '/'.ltrim(substr($route->uri(), strlen('api')), '/');

            foreach ($route->methods() as $method) {
                if (! in_array($method, self::REST_METHODS, true)) {
                    continue;
                }

                $operation = $operations[$path][strtolower($method)] ?? [];

                $routes[] = [
                    'method' => $method,
                    'uri' => '/'.$route->uri(),
                    'name' => $route->getName(),
                    'action' => $route->getActionName(),
                    'middleware' => array_values($route->gatherMiddleware()),
                    'summary' => $operation['summary'] ?? null,
                    'tags' => $operation['tags'] ?? [],
                ];
            }
        }

        usort($routes, function (array $a, array $b): int {
            return [$a['uri'], $a['method']] <=> [$b['uri'], $b['method']];
        });

        return $routes;
    }

    private function isApiRoute(Route $route): bool
    {
        if (! str_starts_with($route->uri(), 'api') || str_contains($route->uri(), 'oauth2')) {
            return false;
        }

        // The index of the API is not part of the REST catalogue.
        if (in_array($route->getName(), ['api.index', 'api.index.json'], true)) {
            return false;
        }

        return $route->getAction('controller') !== null;
    }

    /**
     * Operations of the generated OpenAPI document indexed by path and method.
     *
     * @return array<string, array<string, array<string, mixed>>>
     */
    private function openApiOperations(): array
    {
        $file = base_path('documentacion/api-docs.json');

        if (! is_file($file)) {
            return [];
        }

        $document = json_decode((string) file_get_contents($file), true);

        if (! is_array($document) || ! isset($document['paths'])) {
            return [];
        }

        $operations = [];

        foreach ($document['paths'] as $path => $methods) {
            foreach ($methods as $method => $operation) {
                if (! is_array($operation)) {
                    continue;
                }

                $operations[$path][strtolower($method)] = [
                    'summary' => $operation['summary'] ?? null,
                    'tags' => $operation['tags'] ?? [],
                ];
            }
        }

        return $operations;
    }

    /**
     * @return array<string, string>
     */
    private function documentationLinks(): array
    {
        return [
            'swagger_ui' => route('l5-swagger.default.api'),
            'openapi_json' => route('l5-swagger.default.docs'),
            'openapi_file' => 'backend/documentacion/api-docs.json',
            'health' => url('/up'),
        ];
    }
}

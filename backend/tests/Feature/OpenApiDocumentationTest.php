<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Verifies that the generated OpenAPI document stays in sync with the
 * real routes, the authentication configuration and the API Resources.
 */
class OpenApiDocumentationTest extends TestCase
{
    private const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    private string $documentPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->documentPath = base_path('documentacion/api-docs.json');
    }

    public function test_the_openapi_document_is_generated_and_valid(): void
    {
        $this->assertFileExists($this->documentPath, 'Run: php artisan l5-swagger:generate');

        $content = file_get_contents($this->documentPath);
        $document = json_decode($content, true);

        $this->assertIsArray($document, 'The OpenAPI document must be a valid JSON file.');
        $this->assertSame('3.0.0', $document['openapi']);
        $this->assertArrayHasKey('paths', $document);
        $this->assertArrayHasKey('schemas', $document['components']);
        $this->assertNotEmpty($document['paths']);
    }

    public function test_the_bearer_security_scheme_is_configured(): void
    {
        $document = $this->document();

        $this->assertArrayHasKey('sanctum', $document['components']['securitySchemes']);
        $this->assertSame('http', $document['components']['securitySchemes']['sanctum']['type']);
        $this->assertSame('bearer', $document['components']['securitySchemes']['sanctum']['scheme']);
    }

    public function test_every_api_route_is_documented(): void
    {
        $document = $this->document();

        foreach ($this->apiRoutes() as [$method, $path]) {
            $this->assertArrayHasKey(
                $path,
                $document['paths'],
                "The route {$method} {$path} is not documented."
            );

            $this->assertArrayHasKey(
                strtolower($method),
                $document['paths'][$path],
                "The route {$method} {$path} is not documented."
            );
        }
    }

    public function test_only_public_endpoints_are_without_security(): void
    {
        $document = $this->document();
        $public = ['/register', '/login'];

        foreach ($document['paths'] as $path => $operations) {
            foreach ($operations as $method => $operation) {
                if (! in_array($method, ['get', 'post', 'put', 'patch', 'delete'], true)) {
                    continue;
                }

                if (in_array($path, $public, true)) {
                    $this->assertArrayNotHasKey('security', $operation, "{$method} {$path} is public.");

                    continue;
                }

                $this->assertArrayHasKey('security', $operation, "{$method} {$path} must require authentication.");
                $this->assertSame(
                    [['sanctum' => []]],
                    $operation['security'],
                    "{$method} {$path} must use the sanctum bearer scheme."
                );
            }
        }
    }

    public function test_all_references_are_resolvable(): void
    {
        $document = $this->document();

        foreach ($this->references($document) as $reference) {
            $node = $document;

            foreach (explode('/', ltrim($reference, '#/')) as $segment) {
                $this->assertIsArray($node);
                $this->assertArrayHasKey($segment, $node, "Broken reference: {$reference}");
                $node = $node[$segment];
            }
        }
    }

    public function test_the_swagger_ui_is_served_from_the_root_path(): void
    {
        $this->get('/')->assertStatus(200);

        $this->get('/docs')
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'application/json');
    }

    /**
     * @return array<string, mixed>
     */
    private function document(): array
    {
        $document = json_decode((string) file_get_contents($this->documentPath), true);

        $this->assertIsArray($document);

        return $document;
    }

    /**
     * @return list<array{0: string, 1: string}>
     */
    private function apiRoutes(): array
    {
        $routes = [];

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();

            if (! str_starts_with($uri, 'api/') || str_contains($uri, 'oauth2')) {
                continue;
            }

            $path = '/'.substr($uri, 4);
            $path = preg_replace('#\{([^}]+)\}#', '{$1}', $path) ?? $path;

            foreach ($route->methods() as $method) {
                if (in_array($method, self::METHODS, true)) {
                    $routes[] = [$method, $path];
                }
            }
        }

        return $routes;
    }

    /**
     * @param  array<string, mixed>  $node
     * @return list<string>
     */
    private function references(array $node): array
    {
        $references = [];

        array_walk_recursive($node, function ($value, $key) use (&$references): void {
            if ($key === '$ref' && is_string($value)) {
                $references[] = $value;
            }
        });

        return array_values(array_unique($references));
    }
}

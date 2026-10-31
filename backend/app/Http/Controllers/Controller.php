<?php

namespace App\Http\Controllers;

use Illuminate\Routing\Controller as BaseController;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use OpenApi\Attributes as OA;

#[OA\Info(
    title: "TaskFlow API",
    version: "1.0.0",
    description: "API for managing projects, tasks, and team collaboration.",
    contact: new OA\Contact(name: "Development Team", email: "dev@taskflow.com")
)]
#[OA\Server(
    url: "http://localhost:8000/api",
    description: "Local Server"
)]
#[OA\SecurityScheme(
    securityScheme: "sanctum",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Enter your Sanctum token to access protected endpoints"
)]
class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;
}

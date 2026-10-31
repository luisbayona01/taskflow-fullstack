<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    #[OA\Post(
        path: "/register",
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name", "email", "password", "password_confirmation"],
                properties: [
                    new OA\Property(property: "name", type: "string", maxLength: 255, example: "John Doe"),
                    new OA\Property(property: "email", type: "string", format: "email", maxLength: 255, description: "Must be unique.", example: "john@example.com"),
                    new OA\Property(property: "password", type: "string", format: "password", minLength: 8, maxLength: 255, description: "Minimum 8 characters. Must match password_confirmation.", example: "Secret123!"),
                    new OA\Property(property: "password_confirmation", type: "string", format: "password", description: "Confirmation of the password.", example: "Secret123!"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "User registered successfully", content: new OA\JsonContent(ref: "#/components/schemas/AuthResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function register(RegisterRequest $request, AuthService $authService): JsonResponse
    {
        $result = $authService->register($request->validated());

        return ApiResponse::success(
            'User registered successfully.',
            $this->authenticationData($result),
            201
        );
    }

    #[OA\Post(
        path: "/login",
        summary: "Authenticate a user and obtain a Sanctum token",
        tags: ["Authentication"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", format: "email", maxLength: 255, example: "john@example.com"),
                    new OA\Property(property: "password", type: "string", format: "password", example: "Secret123!"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Authenticated successfully", content: new OA\JsonContent(ref: "#/components/schemas/AuthResponse")),
            new OA\Response(response: 401, description: "Invalid credentials", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 429, description: "Too many login attempts", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function login(LoginRequest $request, AuthService $authService): JsonResponse
    {
        $credentials = $request->validated();

        $result = $authService->login(
            $credentials['email'],
            $credentials['password'],
            $request->ip()
        );

        return ApiResponse::success(
            'User logged in successfully.',
            $this->authenticationData($result)
        );
    }

    #[OA\Post(
        path: "/logout",
        summary: "Revoke the token of the authenticated user",
        tags: ["Authentication"],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: "Logged out successfully", content: new OA\JsonContent(ref: "#/components/schemas/MessageResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function logout(Request $request, AuthService $authService): JsonResponse
    {
        $authService->logout($request->user());

        return ApiResponse::success('User logged out successfully.');
    }

    #[OA\Get(
        path: "/me",
        summary: "Get the profile of the authenticated user",
        tags: ["Authentication"],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: "Profile of the authenticated user", content: new OA\JsonContent(ref: "#/components/schemas/UserResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(
            'Authenticated user.',
            ['user' => new UserResource($request->user())]
        );
    }

    /**
     * @param  array{user: User, token: string, token_type: string}  $result
     * @return array{user: UserResource, token: string, token_type: string}
     */
    private function authenticationData(array $result): array
    {
        return [
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => $result['token_type'],
        ];
    }
}

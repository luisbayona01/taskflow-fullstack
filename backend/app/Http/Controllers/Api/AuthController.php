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

class AuthController extends Controller
{
    public function register(RegisterRequest $request, AuthService $authService): JsonResponse
    {
        $result = $authService->register($request->validated());

        return ApiResponse::success(
            'User registered successfully.',
            $this->authenticationData($result),
            201
        );
    }

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

    public function logout(Request $request, AuthService $authService): JsonResponse
    {
        $authService->logout($request->user());

        return ApiResponse::success('User logged out successfully.');
    }

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

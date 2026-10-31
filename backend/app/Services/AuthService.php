<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService
{
    private const MAX_LOGIN_ATTEMPTS = 5;

    private const LOGIN_DECAY_SECONDS = 60;

    private const TOKEN_NAME = 'auth-token';

    /**
     * Register a new user and issue an access token.
     *
     * @param  array{name: string, email: string, password: string}  $data
     * @return array{user: User, token: string, token_type: string}
     */
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        return $this->issueToken($user);
    }

    /**
     * Authenticate a user and issue an access token.
     *
     * The same generic error is returned for an unknown email and a wrong
     * password so the endpoint cannot be used to enumerate accounts.
     *
     * @return array{user: User, token: string, token_type: string}
     *
     * @throws AuthenticationException
     * @throws ThrottleRequestsException
     */
    public function login(string $email, string $password, string $ip): array
    {
        $throttleKey = $this->throttleKey($email, $ip);

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_LOGIN_ATTEMPTS)) {
            $retryAfter = RateLimiter::availableIn($throttleKey);

            throw new ThrottleRequestsException(
                "Too many login attempts. Please try again in {$retryAfter} seconds.",
                null,
                [
                    'Retry-After' => $retryAfter,
                    'X-RateLimit-Limit' => self::MAX_LOGIN_ATTEMPTS,
                    'X-RateLimit-Remaining' => 0,
                ]
            );
        }

        $user = User::where('email', $email)->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            RateLimiter::hit($throttleKey, self::LOGIN_DECAY_SECONDS);

            throw new AuthenticationException('Invalid credentials.');
        }

        RateLimiter::clear($throttleKey);

        return $this->issueToken($user);
    }

    /**
     * Revoke the token used for the current request.
     */
    public function logout(User $user): void
    {
        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }
    }

    /**
     * @return array{user: User, token: string, token_type: string}
     */
    private function issueToken(User $user): array
    {
        return [
            'user' => $user,
            'token' => $user->createToken(self::TOKEN_NAME)->plainTextToken,
            'token_type' => 'Bearer',
        ];
    }

    private function throttleKey(string $email, string $ip): string
    {
        return 'login|'.Str::lower($email).'|'.$ip;
    }
}

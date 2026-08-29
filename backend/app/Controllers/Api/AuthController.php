<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

class AuthController extends ApiController
{
    public function csrf(): ResponseInterface
    {
        return $this->data(['token' => csrf_hash()]);
    }

    public function register(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'name', 'email');
        if (! $this->validateData($input, 'register')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        if (($limited = $this->limitByIpAndValue('register', $input['email'], 5, 3600, 2, 3600)) !== null) {
            return $limited;
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->register($input['name'], $input['email'], $input['password']);
            return $this->emptyResponse(201);
        });
    }

    public function login(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'email');
        if (! $this->validateData($input, 'login')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        if (($limited = $this->limitByIpAndValue('login', $input['email'], 30, 300, 10, 900)) !== null) {
            return $limited;
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->login($input['email'], $input['password']);
            return $this->emptyResponse();
        });
    }

    public function logout(): ResponseInterface
    {
        return $this->action(function (): ResponseInterface {
            service('authService')->logout();
            return $this->emptyResponse();
        });
    }

    public function requestEmailVerification(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'email');
        if (! $this->validateData($input, 'emailRequest')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        if (($limited = $this->limitByIpAndValue('verify-email', $input['email'], 10, 3600, 3, 3600)) !== null) {
            return $limited;
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->requestEmailVerification($input['email']);
            return $this->emptyResponse();
        });
    }

    public function emailVerificationStatus(): ResponseInterface
    {
        return $this->action(fn (): ResponseInterface => $this->data([
            'verified' => service('authService')->emailVerificationStatus(),
        ]));
    }

    public function confirmEmailVerification(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'token');
        if (! $this->validateData($input, 'tokenRequest')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->verifyEmail($input['token']);
            return $this->emptyResponse();
        });
    }

    public function requestPasswordReset(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'email');
        if (! $this->validateData($input, 'emailRequest')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        if (($limited = $this->limitByIpAndValue('reset-password', $input['email'], 10, 3600, 3, 3600)) !== null) {
            return $limited;
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->requestPasswordReset($input['email']);
            return $this->emptyResponse();
        });
    }

    public function validatePasswordReset(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'token');
        if (! $this->validateData($input, 'tokenRequest')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->validatePasswordResetToken($input['token']);
            return $this->emptyResponse();
        });
    }

    public function confirmPasswordReset(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'token');
        if (! $this->validateData($input, 'resetPassword')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->resetPassword($input['token'], $input['password']);
            return $this->emptyResponse();
        });
    }

    private function limitByIpAndValue(
        string $action,
        string $value,
        int $ipCapacity,
        int $ipSeconds,
        int $valueCapacity,
        int $valueSeconds,
    ): ?ResponseInterface {
        return $this->rateLimit($action . '-ip', $this->request->getIPAddress(), $ipCapacity, $ipSeconds)
            ?? $this->rateLimit($action . '-value', $value, $valueCapacity, $valueSeconds);
    }
}

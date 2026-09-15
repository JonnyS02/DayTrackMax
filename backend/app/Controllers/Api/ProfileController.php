<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

class ProfileController extends ApiController
{
    public function show(): ResponseInterface
    {
        return $this->action(fn (): ResponseInterface => $this->data(service('authService')->profile($this->userId())));
    }

    public function update(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'name', 'email');
        if (! $this->validateData($input, 'profile')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(fn (): ResponseInterface => $this->data(
            service('authService')->updateProfile(
                $this->userId(),
                $input['name'],
                $input['email'],
                $input['currentPassword'] ?? '',
            ),
        ));
    }

    public function requestPasswordChange(): ResponseInterface
    {
        if (($limited = $this->rateLimit('profile-password', (string) $this->userId(), 3, 3600)) !== null) {
            return $limited;
        }

        return $this->action(function (): ResponseInterface {
            service('authService')->requestPasswordChange($this->userId());
            return $this->emptyResponse();
        });
    }

    public function updateLocale(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'locale');
        if (! $this->validateData($input, 'locale')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->updateLocale($this->userId(), $input['locale']);
            return $this->emptyResponse();
        });
    }

    public function cancelEmailChange(): ResponseInterface
    {
        return $this->action(fn (): ResponseInterface => $this->data(
            service('authService')->cancelEmailChange($this->userId()),
        ));
    }

    public function delete(): ResponseInterface
    {
        $input = $this->input();
        if (! $this->validateData($input, 'deleteAccount')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        return $this->action(function () use ($input): ResponseInterface {
            service('authService')->deleteAccount($this->userId(), $input['password']);
            return $this->emptyResponse();
        });
    }
}

<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

class BirthdayController extends ApiController
{
    private const PAGE_SIZES = [5, 10, 20, 50];

    public function index(): ResponseInterface
    {
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $perPage = (int) ($this->request->getGet('perPage') ?? 5);
        $perPage = in_array($perPage, self::PAGE_SIZES, true) ? $perPage : 5;
        $search = mb_substr(trim((string) ($this->request->getGet('search') ?? '')), 0, 100);

        return $this->action(fn (): ResponseInterface => $this->data(
            service('birthdayService')->listForUser($this->userId(), $search, $page, $perPage),
        ));
    }

    public function create(): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'firstName', 'lastName', 'birthDate');
        if (($failure = $this->validateBirthday($input)) !== null) {
            return $failure;
        }

        return $this->action(fn (): ResponseInterface => $this->data(
            service('birthdayService')->create($this->userId(), $input),
            201,
        ));
    }

    public function update(int $birthdayId): ResponseInterface
    {
        $input = $this->trimInput($this->input(), 'firstName', 'lastName', 'birthDate');
        if (($failure = $this->validateBirthday($input)) !== null) {
            return $failure;
        }

        return $this->action(fn (): ResponseInterface => $this->data(
            service('birthdayService')->update($this->userId(), $birthdayId, $input),
        ));
    }

    public function delete(int $birthdayId): ResponseInterface
    {
        return $this->action(function () use ($birthdayId): ResponseInterface {
            service('birthdayService')->delete($this->userId(), $birthdayId);

            return $this->response->setStatusCode(204);
        });
    }

    /**
     * @param array<string, mixed> $input
     */
    private function validateBirthday(array $input): ?ResponseInterface
    {
        if (! $this->validateData($input, 'birthday')) {
            return $this->validationFailure($this->validator->getErrors());
        }

        $errors = [];
        if (! array_key_exists('notifyOnBirthday', $input) || ! is_bool($input['notifyOnBirthday'])) {
            $errors['notifyOnBirthday'] = 'Bitte wähle eine gültige Benachrichtigungseinstellung.';
        }

        $daysBefore = $input['notifyDaysBefore'] ?? null;
        if ($daysBefore !== null && (! is_int($daysBefore) || $daysBefore < 1 || $daysBefore > 365)) {
            $errors['notifyDaysBefore'] = 'Die Vorab-Erinnerung muss zwischen 1 und 365 Tagen liegen.';
        }

        if ($input['birthDate'] > date('Y-m-d')) {
            $errors['birthDate'] = 'Das Geburtsdatum darf nicht in der Zukunft liegen.';
        }

        return $errors === [] ? null : $this->validationFailure($errors);
    }
}

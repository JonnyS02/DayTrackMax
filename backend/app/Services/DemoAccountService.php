<?php

namespace App\Services;

use App\Models\AuthTokenModel;
use App\Models\BirthdayModel;
use App\Models\UserModel;
use CodeIgniter\Database\BaseConnection;
use Config\DayTrack;
use Config\Services;
use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class DemoAccountService
{
    private const BIRTHDAYS = [
        ['firstName' => 'Emma', 'lastName' => 'Johnson', 'age' => 29, 'daysUntil' => 0, 'notifyOnBirthday' => true, 'notifyDaysBefore' => null],
        ['firstName' => 'Liam', 'lastName' => 'Carter', 'age' => 34, 'daysUntil' => 3, 'notifyOnBirthday' => true, 'notifyDaysBefore' => 3],
        ['firstName' => 'Olivia', 'lastName' => 'Bennett', 'age' => 27, 'daysUntil' => 12, 'notifyOnBirthday' => true, 'notifyDaysBefore' => 7],
        ['firstName' => 'Noah', 'lastName' => 'Williams', 'age' => 41, 'daysUntil' => 30, 'notifyOnBirthday' => false, 'notifyDaysBefore' => 14],
        ['firstName' => 'Sophia', 'lastName' => 'Miller', 'age' => 25, 'daysUntil' => 75, 'notifyOnBirthday' => true, 'notifyDaysBefore' => null],
        ['firstName' => 'James', 'lastName' => 'Wilson', 'age' => 52, 'daysUntil' => 150, 'notifyOnBirthday' => false, 'notifyDaysBefore' => null],
    ];

    public function __construct(
        private readonly UserModel $users,
        private readonly BirthdayModel $birthdays,
        private readonly AuthTokenModel $tokens,
        private readonly BaseConnection $database,
        private readonly DayTrack $config,
    ) {
    }

    /**
     * @return array{enabled: bool, created: bool, birthdays: int}
     */
    public function reset(): array
    {
        if (! $this->config->demoAccountEnabled) {
            return ['enabled' => false, 'created' => false, 'birthdays' => 0];
        }

        $name = trim($this->config->demoAccountName);
        $email = mb_strtolower(trim($this->config->demoAccountEmail));
        $password = $this->config->demoAccountPassword;
        $this->validateConfiguration($name, $email, $password);

        if (! $this->database->transBegin()) {
            throw new RuntimeException('The demo account reset transaction could not be started.');
        }
        try {
            $user = $this->users->findByEmail($email);
            $created = $user === null;
            $userData = [
                'name' => $name,
                'email' => $email,
                'pending_email' => null,
                'locale' => 'en',
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'email_verified' => true,
                'failed_login_attempts' => 0,
            ];

            if ($created) {
                $userId = $this->users->insert($userData, true);
                if ($userId === false) {
                    throw new RuntimeException('The demo account could not be created.');
                }
                $userId = (int) $userId;
            } else {
                $userId = (int) $user['id'];
                $this->users->update($userId, $userData);
            }

            $this->tokens->deleteForUser($userId);
            $this->birthdays->deleteAllForUser($userId);
            $this->birthdays->insertBatch($this->birthdayRows($userId));
            if (! $this->database->transStatus() || ! $this->database->transCommit()) {
                throw new RuntimeException('The demo account reset could not be completed.');
            }

            return ['enabled' => true, 'created' => $created, 'birthdays' => count(self::BIRTHDAYS)];
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function birthdayRows(int $userId): array
    {
        $today = new DateTimeImmutable('today', new DateTimeZone(config('App')->appTimezone));

        return array_map(function (array $birthday) use ($userId, $today): array {
            return [
                'user_id' => $userId,
                'first_name' => $birthday['firstName'],
                'last_name' => $birthday['lastName'],
                'birth_date' => $this->birthDate($today, $birthday['daysUntil'], $birthday['age']),
                'notify_on_birthday' => $birthday['notifyOnBirthday'],
                'notify_days_before' => $birthday['notifyDaysBefore'],
            ];
        }, self::BIRTHDAYS);
    }

    private function birthDate(DateTimeImmutable $today, int $daysUntil, int $nextAge): string
    {
        $nextBirthday = $today->modify("+{$daysUntil} days");
        $birthYear = (int) $nextBirthday->format('Y') - $nextAge;
        $month = (int) $nextBirthday->format('m');
        $day = (int) $nextBirthday->format('d');

        // Use a leap birth year for February 29.
        while (! checkdate($month, $day, $birthYear)) {
            $birthYear--;
        }

        return sprintf('%04d-%02d-%02d', $birthYear, $month, $day);
    }

    private function validateConfiguration(string $name, string $email, string $password): void
    {
        $data = compact('name', 'email', 'password');
        $rules = array_intersect_key(config('Validation')->register, $data);
        $validation = Services::validation(null, false);

        if (! $validation->setRules($rules)->run($data)) {
            throw new InvalidArgumentException('The demo account configuration does not meet the registration requirements.');
        }
    }
}

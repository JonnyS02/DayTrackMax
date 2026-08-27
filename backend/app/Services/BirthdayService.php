<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\BirthdayModel;
use Config\DayTrack;
use DateTimeImmutable;
use DateTimeZone;
use Throwable;

class BirthdayService
{
    public function __construct(
        private readonly BirthdayModel $birthdays,
        private readonly MailService $mail,
        private readonly DayTrack $config,
    ) {
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(int $userId, array $input): array
    {
        $birthdayId = (int) $this->birthdays->insert($this->databaseData($input) + ['user_id' => $userId], true);

        return $this->present($this->requireBirthday($birthdayId, $userId));
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function update(int $userId, int $birthdayId, array $input): array
    {
        $this->requireBirthday($birthdayId, $userId);
        $this->birthdays->update($birthdayId, $this->databaseData($input));

        return $this->present($this->requireBirthday($birthdayId, $userId));
    }

    public function delete(int $userId, int $birthdayId): void
    {
        $this->requireBirthday($birthdayId, $userId);
        $this->birthdays->delete($birthdayId);
    }

    /**
     * @return array{items: list<array<string, mixed>>, featured: list<array<string, mixed>>, meta: array{page: int, perPage: int, total: int, pageCount: int}}
     */
    public function listForUser(int $userId, string $search, int $page, int $perPage): array
    {
        $today = $this->today();
        $all = array_map(fn (array $birthday): array => $this->present($birthday, $today), $this->birthdays->findAllForUser($userId));
        usort($all, static fn (array $left, array $right): int => [$left['daysUntil'], $left['lastName'], $left['firstName']] <=> [$right['daysUntil'], $right['lastName'], $right['firstName']]);

        $featured = [];
        if ($all !== []) {
            $firstDays = $all[0]['daysUntil'];
            $featured = array_values(array_filter($all, static fn (array $birthday): bool => $birthday['daysUntil'] === $firstDays));
        }

        $search = mb_strtolower(trim($search));
        $filtered = $search === ''
            ? $all
            : array_values(array_filter($all, static function (array $birthday) use ($search): bool {
                return str_contains(mb_strtolower($birthday['firstName'] . ' ' . $birthday['lastName']), $search);
            }));

        $total = count($filtered);
        $pageCount = max(1, (int) ceil($total / $perPage));
        $page = min(max(1, $page), $pageCount);

        return [
            'items' => array_slice($filtered, ($page - 1) * $perPage, $perPage),
            'featured' => $featured,
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'pageCount' => $pageCount,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function present(array $birthday, ?DateTimeImmutable $today = null): array
    {
        $today ??= $this->today();
        $birthDate = new DateTimeImmutable($birthday['birth_date'], $today->getTimezone());
        $thisYear = $this->occurrence($birthDate, (int) $today->format('Y'));
        $next = $thisYear < $today ? $this->occurrence($birthDate, (int) $today->format('Y') + 1) : $thisYear;
        $currentAge = (int) $today->format('Y') - (int) $birthDate->format('Y') - ($today < $thisYear ? 1 : 0);

        return [
            'id' => (int) $birthday['id'],
            'firstName' => $birthday['first_name'],
            'lastName' => $birthday['last_name'],
            'birthDate' => $birthday['birth_date'],
            'notifyOnBirthday' => (bool) $birthday['notify_on_birthday'],
            'notifyDaysBefore' => $birthday['notify_days_before'] === null ? null : (int) $birthday['notify_days_before'],
            'currentAge' => $currentAge,
            'nextAge' => (int) $next->format('Y') - (int) $birthDate->format('Y'),
            'daysUntil' => (int) $today->diff($next)->format('%a'),
        ];
    }

    /**
     * @return array{sent: int, failed: int}
     */
    public function sendDueReminders(): array
    {
        $today = $this->today();
        $sent = 0;
        $failed = 0;

        foreach ($this->birthdays->findAllForReminders() as $birthday) {
            $presented = $this->present($birthday, $today);
            $days = $presented['daysUntil'];
            $isDue = ($days === 0 && $presented['notifyOnBirthday'])
                || ($presented['notifyDaysBefore'] !== null && $days === $presented['notifyDaysBefore']);

            if (! $isDue) {
                continue;
            }

            $personName = trim($presented['firstName'] . ' ' . $presented['lastName']);
            $firstName = trim($presented['firstName']);
            $timing = $days === 0 ? 'heute' : ($days === 1 ? 'morgen' : "in {$days} Tagen");
            $ageLabel = $presented['nextAge'] === 1 ? '1 Jahr' : $presented['nextAge'] . ' Jahre';
            $detailLine = "{$personName} wird {$timing} {$ageLabel} alt.";

            try {
                $this->mail->send('birthday-reminder', $birthday['user_email'], "{$firstName} hat {$timing} Geburtstag", [
                    'preview_text' => $detailLine,
                    'headline' => "{$firstName} hat {$timing} Geburtstag",
                    'detail_line' => $detailLine,
                    'dashboard_url' => rtrim($this->config->frontendURL, '/') . '/',
                ]);
                $sent++;
            } catch (Throwable $exception) {
                $failed++;
                log_message('error', 'Geburtstagserinnerung {birthdayId} fehlgeschlagen: {message}', [
                    'birthdayId' => $birthday['id'],
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return ['sent' => $sent, 'failed' => $failed];
    }

    private function occurrence(DateTimeImmutable $birthDate, int $year): DateTimeImmutable
    {
        $month = (int) $birthDate->format('m');
        $day = (int) $birthDate->format('d');

        if (! checkdate($month, $day, $year)) {
            return new DateTimeImmutable("{$year}-03-01", $birthDate->getTimezone());
        }

        return new DateTimeImmutable(sprintf('%04d-%02d-%02d', $year, $month, $day), $birthDate->getTimezone());
    }

    private function today(): DateTimeImmutable
    {
        return new DateTimeImmutable('today', new DateTimeZone(config('App')->appTimezone));
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function databaseData(array $input): array
    {
        return [
            'first_name' => trim($input['firstName']),
            'last_name' => trim($input['lastName'] ?? ''),
            'birth_date' => $input['birthDate'],
            'notify_on_birthday' => $input['notifyOnBirthday'],
            'notify_days_before' => $input['notifyDaysBefore'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requireBirthday(int $birthdayId, int $userId): array
    {
        $birthday = $this->birthdays->findForUser($birthdayId, $userId);
        if ($birthday === null) {
            throw new ApiException('BIRTHDAY_NOT_FOUND', 'Der Geburtstag wurde nicht gefunden.', 404);
        }

        return $birthday;
    }
}

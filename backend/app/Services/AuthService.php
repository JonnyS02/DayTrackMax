<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\AuthTokenModel;
use App\Models\UserModel;
use CodeIgniter\Database\BaseConnection;
use CodeIgniter\Session\Session;
use CodeIgniter\Throttle\ThrottlerInterface;
use Config\DayTrack;
use DateTimeImmutable;
use DateTimeZone;
use Throwable;

class AuthService
{
    private const VERIFY_EMAIL = 'verify_email';
    private const VERIFY_EMAIL_CHANGE = 'verify_email_change';
    private const RESET_PASSWORD = 'reset_password';
    private const VERIFICATION_USER_ID = 'verification_user_id';
    private const REAUTHENTICATION_FAILURE_LIMIT = 5;
    private const REAUTHENTICATION_WINDOW_SECONDS = 900;

    public function __construct(
        private readonly UserModel $users,
        private readonly AuthTokenModel $tokens,
        private readonly MailService $mail,
        private readonly Session $session,
        private readonly ThrottlerInterface $throttler,
        private readonly BaseConnection $database,
        private readonly DayTrack $config,
    ) {
    }

    public function deleteExpiredTokens(): void
    {
        $this->tokens->deleteExpired();
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string}
     */
    public function register(string $name, string $email, string $password): array
    {
        $email = $this->normalizeEmail($email);
        if ($this->users->emailExists($email)) {
            throw new ApiException('EMAIL_IN_USE', 'Für diese E-Mail-Adresse existiert bereits ein Konto.', 409, [
                'email' => 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
            ]);
        }

        $this->database->transBegin();
        try {
            $userId = (int) $this->users->insert([
                'name' => trim($name),
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'email_verified' => false,
                'failed_login_attempts' => 0,
            ], true);
            $this->database->transCommit();
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }

        $user = $this->requireUser($userId);
        $this->sendVerification($user, self::VERIFY_EMAIL, $email);
        $this->session->set(self::VERIFICATION_USER_ID, $userId);

        return $this->profile($userId);
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string}
     */
    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($this->normalizeEmail($email));

        if ($user === null || ! password_verify($password, $user['password_hash'])) {
            if ($user !== null) {
                $failedLogin = $this->users->recordFailedLoginAttempt((int) $user['id']);
                if ($failedLogin['attempts'] >= 3) {
                    if ($failedLogin['newlyLocked']) {
                        $this->trySendingReset($user, true);
                        throw new ApiException('ACCOUNT_LOCKED', 'Das Konto wurde gesperrt. Ein Reset-Link wurde per E-Mail versendet.', 423);
                    }

                    throw new ApiException('ACCOUNT_LOCKED', 'Das Konto ist gesperrt. Nutzen Sie den Reset-Link oder fordern Sie einen neuen an.', 423);
                }
            }

            throw new ApiException('INVALID_CREDENTIALS', 'E-Mail oder Passwort ist nicht korrekt.', 401);
        }

        if ((int) $user['failed_login_attempts'] >= 3) {
            throw new ApiException('ACCOUNT_LOCKED', 'Das Konto ist gesperrt. Setzen Sie Ihr Passwort über den Link in der E-Mail zurück.', 423);
        }

        if (! (bool) $user['email_verified']) {
            $this->session->set(self::VERIFICATION_USER_ID, (int) $user['id']);
            throw new ApiException('EMAIL_NOT_VERIFIED', 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.', 403);
        }

        $userId = (int) $user['id'];
        $this->throttler->remove($this->reauthenticationThrottleKey($userId));
        $updates = ['failed_login_attempts' => 0];
        $passwordHash = $user['password_hash'];
        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $updates['password_hash'] = $passwordHash;
        }
        $this->users->update($userId, $updates);

        $this->session->regenerate(true);
        $this->session->set([
            'user_id' => $userId,
            'password_fingerprint' => hash('sha256', $passwordHash),
        ]);
        $this->session->remove(self::VERIFICATION_USER_ID);

        return $this->profile($userId);
    }

    public function emailVerificationStatus(): bool
    {
        $userId = (int) $this->session->get(self::VERIFICATION_USER_ID);
        if ($userId < 1) {
            return false;
        }

        $user = $this->users->find($userId);
        if ($user === null) {
            $this->session->remove(self::VERIFICATION_USER_ID);
            return false;
        }

        $verified = (bool) $user['email_verified'];
        if ($verified) {
            $this->session->remove(self::VERIFICATION_USER_ID);
        }

        return $verified;
    }

    public function logout(): void
    {
        $this->session->destroy();
    }

    public function requestEmailVerification(string $email): void
    {
        $email = $this->normalizeEmail($email);
        $user = $this->users->findByVerificationEmail($email);
        if ($user === null) {
            return;
        }

        if ($user['pending_email'] === $email) {
            $this->sendVerification($user, self::VERIFY_EMAIL_CHANGE, $email);
        } elseif (! (bool) $user['email_verified']) {
            $this->sendVerification($user, self::VERIFY_EMAIL, $email);
        }
    }

    public function verifyEmail(string $token): void
    {
        $storedToken = $this->findToken($token, [self::VERIFY_EMAIL, self::VERIFY_EMAIL_CHANGE]);
        $user = $this->requireUser((int) $storedToken['user_id']);

        $this->database->transBegin();
        try {
            if ($storedToken['purpose'] === self::VERIFY_EMAIL_CHANGE) {
                $pendingEmail = $user['pending_email'];
                if ($pendingEmail === null || $this->users->emailExists($pendingEmail, (int) $user['id'])) {
                    throw new ApiException('EMAIL_IN_USE', 'Diese E-Mail-Adresse kann nicht übernommen werden.', 409);
                }

                $this->users->update($user['id'], [
                    'email' => $pendingEmail,
                    'pending_email' => null,
                    'email_verified' => true,
                ]);
            } else {
                $this->users->update($user['id'], ['email_verified' => true]);
            }

            $this->tokens->delete((int) $storedToken['id']);
            $this->database->transCommit();
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }
    }

    public function requestPasswordReset(string $email): void
    {
        $user = $this->users->findByEmail($this->normalizeEmail($email));
        if ($user !== null) {
            $this->trySendingReset($user, (int) $user['failed_login_attempts'] >= 3);
        }
    }

    public function resetPassword(string $token, string $password): void
    {
        $storedToken = $this->findToken($token, [self::RESET_PASSWORD]);
        $userId = (int) $storedToken['user_id'];

        $this->database->transBegin();
        try {
            $this->users->update($userId, [
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'failed_login_attempts' => 0,
            ]);
            $this->tokens->deleteForUserAndPurpose($userId, self::RESET_PASSWORD);
            $this->database->transCommit();
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }

        $this->throttler->remove($this->reauthenticationThrottleKey($userId));
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string}
     */
    public function profile(int $userId): array
    {
        $user = $this->requireUser($userId);

        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'pendingEmail' => $user['pending_email'],
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string}
     */
    public function updateProfile(int $userId, string $name, string $email, string $currentPassword): array
    {
        $user = $this->requireUser($userId);
        $email = $this->normalizeEmail($email);

        if ($email === $user['email']) {
            $this->users->update($userId, ['name' => trim($name), 'pending_email' => null]);
            $this->tokens->deleteForUserAndPurpose($userId, self::VERIFY_EMAIL_CHANGE);

            return $this->profile($userId);
        }

        if ($email === $user['pending_email']) {
            $this->users->update($userId, ['name' => trim($name)]);

            return $this->profile($userId);
        }

        $this->verifyCurrentPassword($user, $currentPassword, 'currentPassword');

        if ($this->users->emailExists($email, $userId)) {
            throw new ApiException('EMAIL_IN_USE', 'Diese E-Mail-Adresse wird bereits verwendet.', 409, [
                'email' => 'Diese E-Mail-Adresse wird bereits verwendet.',
            ]);
        }

        $this->database->transBegin();
        try {
            $this->users->update($userId, ['name' => trim($name), 'pending_email' => $email]);
            $this->sendVerification($user, self::VERIFY_EMAIL_CHANGE, $email);
            $this->database->transCommit();
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }

        return $this->profile($userId);
    }

    public function requestPasswordChange(int $userId): void
    {
        $this->sendReset($this->requireUser($userId));
    }

    public function deleteAccount(int $userId, string $password): void
    {
        $user = $this->requireUser($userId);
        $this->verifyCurrentPassword($user, $password, 'password');

        $this->users->delete($userId);
        $this->session->destroy();
    }

    /**
     * @param array<string, mixed> $user
     */
    private function verifyCurrentPassword(array $user, string $password, string $field): void
    {
        $userId = (int) $user['id'];
        $throttleKey = $this->reauthenticationThrottleKey($userId);

        if (password_verify($password, $user['password_hash'])) {
            $this->throttler->remove($throttleKey);
            return;
        }

        // Four failures consume the bucket; the fifth ends only this session.
        if (! $this->throttler->check(
            $throttleKey,
            self::REAUTHENTICATION_FAILURE_LIMIT - 1,
            self::REAUTHENTICATION_WINDOW_SECONDS,
        )) {
            log_message('warning', 'Sitzung nach wiederholt fehlgeschlagener Reauthentifizierung beendet: Benutzer {userId}', [
                'userId' => $userId,
            ]);
            $this->session->destroy();

            throw new ApiException(
                'REAUTHENTICATION_REQUIRED',
                'Zu viele falsche Passwortversuche. Bitte melden Sie sich erneut an.',
                401,
            );
        }

        throw new ApiException(
            'INVALID_PASSWORD',
            'Das Passwort ist nicht korrekt.',
            422,
            [$field => 'Das Passwort ist nicht korrekt.'],
        );
    }

    private function reauthenticationThrottleKey(int $userId): string
    {
        return 'daytrack-reauth-' . $userId;
    }

    private function sendVerification(array $user, string $purpose, string $recipient): void
    {
        $emailChange = $purpose === self::VERIFY_EMAIL_CHANGE;

        $this->deliverToken(
            (int) $user['id'],
            $purpose,
            $this->config->verificationTokenMinutes,
            function (string $token) use ($user, $recipient, $emailChange): void {
                $url = $this->frontendURL('/verify-email?token=' . rawurlencode($token));
                $this->mail->send('verify-email', $recipient, $emailChange ? 'E-Mail-Änderung bestätigen' : 'E-Mail bestätigen', [
                    'preview_text' => $emailChange
                        ? 'Bestätigen Sie Ihre neue E-Mail-Adresse für DayTrack Max.'
                        : 'Bestätigen Sie Ihre E-Mail-Adresse für DayTrack Max.',
                    'user_name' => $user['name'],
                    'verification_message' => $emailChange
                        ? 'Bestätigen Sie Ihre neue E-Mail-Adresse, um die Änderung abzuschließen.'
                        : 'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.',
                    'verification_url' => $url,
                    'expires_in' => $this->durationLabel($this->config->verificationTokenMinutes),
                ]);
            },
        );
    }

    private function sendReset(array $user, bool $accountLocked = false): void
    {
        $expiresIn = $this->durationLabel($this->config->resetTokenMinutes);

        $this->deliverToken(
            (int) $user['id'],
            self::RESET_PASSWORD,
            $this->config->resetTokenMinutes,
            function (string $token) use ($user, $accountLocked, $expiresIn): void {
                $url = $this->frontendURL('/reset-password?token=' . rawurlencode($token));
                $this->mail->send('reset-password', $user['email'], 'Passwort zurücksetzen', [
                    'preview_text' => $accountLocked
                        ? 'Entsperren Sie Ihr DayTrack-Max-Konto mit einem neuen Passwort.'
                        : 'Legen Sie ein neues Passwort für DayTrack Max fest.',
                    'user_name' => $user['name'],
                    'reset_message' => $accountLocked
                        ? 'Ihr Konto wurde nach drei fehlgeschlagenen Anmeldeversuchen gesperrt. Legen Sie ein neues Passwort fest, um es wieder zu verwenden.'
                        : 'Über diesen Link können Sie ein neues Passwort festlegen.',
                    'reset_note' => 'Der Link ist ' . $expiresIn . ' gültig.'
                        . ($accountLocked ? '' : ' Falls Sie das nicht waren, können Sie diese E-Mail ignorieren.'),
                    'reset_url' => $url,
                ]);
            },
        );
    }

    private function trySendingReset(array $user, bool $accountLocked = false): void
    {
        try {
            $this->sendReset($user, $accountLocked);
        } catch (Throwable $exception) {
            log_message('error', 'Passwort-Reset-E-Mail fehlgeschlagen: {message}', ['message' => $exception->getMessage()]);
        }
    }

    /**
     * @return array{token: string, id: int}
     */
    private function issueToken(int $userId, string $purpose, int $minutes): array
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = $this->now()->modify("+{$minutes} minutes")->format('Y-m-d H:i:s');
        $tokenId = (int) $this->tokens->insert([
            'user_id' => $userId,
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
        ], true);

        return ['token' => $token, 'id' => $tokenId];
    }

    private function deliverToken(int $userId, string $purpose, int $minutes, callable $deliver): void
    {
        ['token' => $token, 'id' => $tokenId] = $this->issueToken($userId, $purpose, $minutes);

        try {
            $deliver($token);
        } catch (Throwable $exception) {
            $this->tokens->delete($tokenId);
            throw $exception;
        }

        $this->tokens->deleteOtherForUserAndPurpose($userId, $purpose, $tokenId);
    }

    /**
     * @param list<string> $purposes
     */
    private function findToken(string $token, array $purposes): array
    {
        if (preg_match('/^[a-f0-9]{64}$/', $token) !== 1) {
            throw new ApiException('INVALID_TOKEN', 'Der Link ist ungültig oder abgelaufen.', 422);
        }

        $storedToken = $this->tokens->findValid(hash('sha256', $token), $purposes);
        if ($storedToken === null) {
            throw new ApiException('INVALID_TOKEN', 'Der Link ist ungültig oder abgelaufen.', 422);
        }

        return $storedToken;
    }

    private function requireUser(int $userId): array
    {
        $user = $this->users->find($userId);
        if ($user === null) {
            throw new ApiException('USER_NOT_FOUND', 'Das Benutzerkonto wurde nicht gefunden.', 404);
        }

        return $user;
    }

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }

    private function frontendURL(string $path): string
    {
        return rtrim($this->config->frontendURL, '/') . $path;
    }

    private function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(config('App')->appTimezone));
    }

    private function durationLabel(int $minutes): string
    {
        if ($minutes % 1440 === 0) {
            $days = intdiv($minutes, 1440);
            return $days === 1 ? '24 Stunden' : "{$days} Tage";
        }

        if ($minutes % 60 === 0) {
            $hours = intdiv($minutes, 60);
            return $hours === 1 ? 'eine Stunde' : "{$hours} Stunden";
        }

        return "{$minutes} Minuten";
    }
}

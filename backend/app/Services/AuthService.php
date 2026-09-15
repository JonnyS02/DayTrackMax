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

    public function register(string $name, string $email, string $password, string $locale): void
    {
        $email = $this->normalizeEmail($email);
        if ($this->config->isDemoEmail($email) || $this->users->emailExists($email)) {
            $message = lang('DayTrack.auth.emailInUseAtRegistration');
            throw new ApiException('EMAIL_IN_USE', $message, 409, [
                'email' => $message,
            ]);
        }

        $name = trim($name);
        $userId = (int) $this->users->insert([
            'name' => $name,
            'email' => $email,
            'locale' => $locale,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'email_verified' => false,
            'failed_login_attempts' => 0,
        ], true);

        $user = ['id' => $userId, 'name' => $name, 'locale' => $locale];
        $this->sendVerification($user, self::VERIFY_EMAIL, $email);
        $this->session->set(self::VERIFICATION_USER_ID, $userId);
    }

    public function login(string $email, string $password): void
    {
        $user = $this->users->findByEmail($this->normalizeEmail($email));

        if ($user === null || ! password_verify($password, $user['password_hash'])) {
            if ($user !== null && ! $this->config->isDemoEmail($user['email'])) {
                $failedLogin = $this->users->recordFailedLoginAttempt((int) $user['id']);
                if ($failedLogin['attempts'] >= 3) {
                    if ($failedLogin['newlyLocked']) {
                        $this->trySendingReset($user, true);
                        throw new ApiException('ACCOUNT_LOCKED', lang('DayTrack.auth.accountLockedNow'), 423);
                    }

                    throw new ApiException('ACCOUNT_LOCKED', lang('DayTrack.auth.accountLocked'), 423);
                }
            }

            throw new ApiException('INVALID_CREDENTIALS', lang('DayTrack.auth.invalidCredentials'), 401);
        }

        if (! $this->config->isDemoEmail($user['email']) && (int) $user['failed_login_attempts'] >= 3) {
            throw new ApiException('ACCOUNT_LOCKED', lang('DayTrack.auth.accountLockedReset'), 423);
        }

        if (! (bool) $user['email_verified']) {
            $this->session->set(self::VERIFICATION_USER_ID, (int) $user['id']);
            throw new ApiException('EMAIL_NOT_VERIFIED', lang('DayTrack.auth.emailNotVerified'), 403);
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
        if ($user === null || $this->config->isDemoEmail($email) || $this->config->isDemoEmail($user['email'])) {
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
        $this->guardDemoAccount($user);

        $this->database->transBegin();
        try {
            if ($storedToken['purpose'] === self::VERIFY_EMAIL_CHANGE) {
                $pendingEmail = $user['pending_email'];
                if ($pendingEmail === null || $this->config->isDemoEmail($pendingEmail) || $this->users->emailExists($pendingEmail, (int) $user['id'])) {
                    throw new ApiException('EMAIL_IN_USE', lang('DayTrack.auth.emailCannotBeUsed'), 409);
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
        if ($user !== null && ! $this->config->isDemoEmail($user['email'])) {
            $this->trySendingReset($user, (int) $user['failed_login_attempts'] >= 3);
        }
    }

    public function validatePasswordResetToken(string $token): void
    {
        $this->findToken($token, [self::RESET_PASSWORD]);
    }

    public function resetPassword(string $token, string $password): void
    {
        $storedToken = $this->findToken($token, [self::RESET_PASSWORD]);
        $userId = (int) $storedToken['user_id'];
        $this->guardDemoAccount($this->requireUser($userId));

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
     * @return array{id: int, name: string, email: string, pendingEmail: ?string, locale: string}
     */
    public function profile(int $userId): array
    {
        $user = $this->requireUser($userId);

        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'pendingEmail' => $user['pending_email'],
            'locale' => $user['locale'],
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string, locale: string}
     */
    public function updateProfile(int $userId, string $name, string $email, string $currentPassword): array
    {
        $user = $this->requireUser($userId);
        $email = $this->normalizeEmail($email);

        if ($email !== $user['email']) {
            $this->guardDemoAccount($user);
            if ($this->config->isDemoEmail($email)) {
                $message = lang('DayTrack.auth.emailCannotBeUsed');
                throw new ApiException('EMAIL_IN_USE', $message, 409, ['email' => $message]);
            }
        }

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
            $message = lang('DayTrack.auth.emailInUse');
            throw new ApiException('EMAIL_IN_USE', $message, 409, [
                'email' => $message,
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
        $user = $this->requireUser($userId);
        $this->guardDemoAccount($user);
        $this->sendReset($user);
    }

    public function updateLocale(int $userId, string $locale): void
    {
        $this->requireUser($userId);
        $this->users->update($userId, ['locale' => $locale]);
    }

    /**
     * @return array{id: int, name: string, email: string, pendingEmail: ?string, locale: string}
     */
    public function cancelEmailChange(int $userId): array
    {
        $this->database->transBegin();
        try {
            $this->users->update($userId, ['pending_email' => null]);
            $this->tokens->deleteForUserAndPurpose($userId, self::VERIFY_EMAIL_CHANGE);
            $this->database->transCommit();
        } catch (Throwable $exception) {
            $this->database->transRollback();
            throw $exception;
        }

        return $this->profile($userId);
    }

    public function deleteAccount(int $userId, string $password): void
    {
        $user = $this->requireUser($userId);
        $this->guardDemoAccount($user);
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
                lang('DayTrack.auth.reauthenticationRequired'),
                401,
            );
        }

        $message = lang('DayTrack.auth.invalidPassword');
        throw new ApiException(
            'INVALID_PASSWORD',
            $message,
            422,
            [$field => $message],
        );
    }

    private function reauthenticationThrottleKey(int $userId): string
    {
        return 'daytrack-reauth-' . $userId;
    }

    /**
     * @param array<string, mixed> $user
     */
    private function guardDemoAccount(array $user): void
    {
        if ($this->config->isDemoEmail($user['email'])) {
            throw new ApiException('DEMO_ACCOUNT_RESTRICTED', lang('DayTrack.auth.demoRestricted'), 403);
        }
    }

    private function sendVerification(array $user, string $purpose, string $recipient): void
    {
        $emailChange = $purpose === self::VERIFY_EMAIL_CHANGE;
        $locale = $user['locale'];

        $this->deliverToken(
            (int) $user['id'],
            $purpose,
            $this->config->verificationTokenMinutes,
            function (string $token) use ($user, $recipient, $emailChange, $locale): void {
                $url = $this->frontendURL('/verify-email?token=' . rawurlencode($token) . '&lang=' . $locale);
                $this->mail->send('verify-email', $locale, $recipient, lang(
                    $emailChange ? 'DayTrack.email.verification.changeSubject' : 'DayTrack.email.verification.subject',
                    [],
                    $locale,
                ), [
                    'preview_text' => lang(
                        $emailChange ? 'DayTrack.email.verification.changePreview' : 'DayTrack.email.verification.preview',
                        [],
                        $locale,
                    ),
                    'user_name' => $user['name'],
                    'verification_message' => lang(
                        $emailChange ? 'DayTrack.email.verification.changeMessage' : 'DayTrack.email.verification.message',
                        [],
                        $locale,
                    ),
                    'verification_url' => $url,
                    'expires_in' => $this->durationLabel($this->config->verificationTokenMinutes, $locale),
                ]);
            },
        );
    }

    private function sendReset(array $user, bool $accountLocked = false): void
    {
        $locale = $user['locale'];
        $expiresIn = $this->durationLabel($this->config->resetTokenMinutes, $locale);

        $this->deliverToken(
            (int) $user['id'],
            self::RESET_PASSWORD,
            $this->config->resetTokenMinutes,
            function (string $token) use ($user, $accountLocked, $expiresIn, $locale): void {
                $url = $this->frontendURL('/reset-password?token=' . rawurlencode($token) . '&lang=' . $locale);
                $this->mail->send('reset-password', $locale, $user['email'], lang('DayTrack.email.reset.subject', [], $locale), [
                    'preview_text' => lang(
                        $accountLocked ? 'DayTrack.email.reset.lockedPreview' : 'DayTrack.email.reset.preview',
                        [],
                        $locale,
                    ),
                    'user_name' => $user['name'],
                    'reset_message' => lang(
                        $accountLocked ? 'DayTrack.email.reset.lockedMessage' : 'DayTrack.email.reset.message',
                        [],
                        $locale,
                    ),
                    'reset_note' => lang(
                        $accountLocked ? 'DayTrack.email.reset.lockedNote' : 'DayTrack.email.reset.note',
                        [$expiresIn],
                        $locale,
                    ),
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

    private function deliverToken(int $userId, string $purpose, int $minutes, callable $deliver): void
    {
        $token = bin2hex(random_bytes(32));
        $now = new DateTimeImmutable('now', new DateTimeZone(config('App')->appTimezone));
        $expiresAt = $now->modify("+{$minutes} minutes")->format('Y-m-d H:i:s');
        $tokenId = (int) $this->tokens->insert([
            'user_id' => $userId,
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
        ], true);

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
            throw new ApiException('INVALID_TOKEN', lang('DayTrack.auth.invalidToken'), 422);
        }

        $storedToken = $this->tokens->findValid(hash('sha256', $token), $purposes);
        if ($storedToken === null) {
            throw new ApiException('INVALID_TOKEN', lang('DayTrack.auth.invalidToken'), 422);
        }

        return $storedToken;
    }

    private function requireUser(int $userId): array
    {
        $user = $this->users->find($userId);
        if ($user === null) {
            throw new ApiException('USER_NOT_FOUND', lang('DayTrack.auth.userNotFound'), 404);
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

    private function durationLabel(int $minutes, string $locale): string
    {
        if ($minutes % 1440 === 0) {
            $days = intdiv($minutes, 1440);
            return lang($days === 1 ? 'DayTrack.email.duration.oneDay' : 'DayTrack.email.duration.days', [$days], $locale);
        }

        if ($minutes % 60 === 0) {
            $hours = intdiv($minutes, 60);
            return lang($hours === 1 ? 'DayTrack.email.duration.oneHour' : 'DayTrack.email.duration.hours', [$hours], $locale);
        }

        return lang('DayTrack.email.duration.minutes', [$minutes], $locale);
    }
}

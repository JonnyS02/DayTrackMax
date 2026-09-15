<?php

namespace App\Models;

use CodeIgniter\Model;
use Throwable;

class UserModel extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useTimestamps = false;
    protected $allowedFields = [
        'name',
        'email',
        'pending_email',
        'locale',
        'password_hash',
        'email_verified',
        'failed_login_attempts',
    ];

    public function findByEmail(string $email): ?array
    {
        return $this->where('email', $email)->first();
    }

    public function findByVerificationEmail(string $email): ?array
    {
        return $this
            ->groupStart()
                ->where('email', $email)
                ->orWhere('pending_email', $email)
            ->groupEnd()
            ->first();
    }

    public function emailExists(string $email, ?int $exceptUserId = null): bool
    {
        $builder = $this
            ->groupStart()
                ->where('email', $email)
                ->orWhere('pending_email', $email)
            ->groupEnd();

        if ($exceptUserId !== null) {
            $builder->where('id !=', $exceptUserId);
        }

        return $builder->first() !== null;
    }

    /**
     * @return array{attempts: int, newlyLocked: bool}
     */
    public function recordFailedLoginAttempt(int $userId): array
    {
        $this->db->transBegin();
        try {
            $this->builder()
                ->set('failed_login_attempts', 'LEAST(failed_login_attempts + 1, 3)', false)
                ->where('id', $userId)
                ->update();

            $changed = $this->db->affectedRows() === 1;
            $attempts = (int) ($this->find($userId)['failed_login_attempts'] ?? 0);
            $this->db->transCommit();

            return [
                'attempts' => $attempts,
                'newlyLocked' => $changed && $attempts === 3,
            ];
        } catch (Throwable $exception) {
            $this->db->transRollback();
            throw $exception;
        }
    }
}

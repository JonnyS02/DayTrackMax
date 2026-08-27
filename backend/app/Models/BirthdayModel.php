<?php

namespace App\Models;

use CodeIgniter\Model;

class BirthdayModel extends Model
{
    protected $table = 'birthdays';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useTimestamps = false;
    protected $allowedFields = [
        'user_id',
        'first_name',
        'last_name',
        'birth_date',
        'notify_on_birthday',
        'notify_days_before',
    ];

    public function findForUser(int $birthdayId, int $userId): ?array
    {
        return $this->where('id', $birthdayId)->where('user_id', $userId)->first();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function findAllForUser(int $userId): array
    {
        return $this->where('user_id', $userId)->findAll();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function findAllForReminders(): array
    {
        return $this
            ->select('birthdays.*, users.email AS user_email')
            ->join('users', 'users.id = birthdays.user_id')
            ->where('users.email_verified', 1)
            ->findAll();
    }
}

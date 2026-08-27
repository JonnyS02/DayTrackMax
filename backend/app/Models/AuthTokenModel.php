<?php

namespace App\Models;

use CodeIgniter\Model;

class AuthTokenModel extends Model
{
    protected $table = 'auth_tokens';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $useTimestamps = false;
    protected $allowedFields = ['user_id', 'purpose', 'token_hash', 'expires_at'];

    /**
     * @param list<string> $purposes
     */
    public function findValid(string $tokenHash, array $purposes): ?array
    {
        return $this
            ->where('token_hash', $tokenHash)
            ->whereIn('purpose', $purposes)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->first();
    }

    public function deleteForUserAndPurpose(int $userId, string $purpose): void
    {
        $this->where('user_id', $userId)->where('purpose', $purpose)->delete();
    }

    public function deleteOtherForUserAndPurpose(int $userId, string $purpose, int $tokenId): void
    {
        $this
            ->where('user_id', $userId)
            ->where('purpose', $purpose)
            ->where('id !=', $tokenId)
            ->delete();
    }

    public function deleteExpired(): void
    {
        $this->where('expires_at <=', date('Y-m-d H:i:s'))->delete();
    }
}

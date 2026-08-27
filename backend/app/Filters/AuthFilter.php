<?php

namespace App\Filters;

use App\Models\UserModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null): ?ResponseInterface
    {
        $session = session();
        $userId = $session->get('user_id');
        $passwordFingerprint = $session->get('password_fingerprint');

        if ($userId !== null && is_string($passwordFingerprint)) {
            $user = (new UserModel())->find((int) $userId);
            if (
                $user !== null
                && (bool) $user['email_verified']
                && hash_equals(hash('sha256', $user['password_hash']), $passwordFingerprint)
            ) {
                return null;
            }
        }

        $session->destroy();

        return service('response')
            ->setStatusCode(401)
            ->setJSON(['error' => ['code' => 'UNAUTHENTICATED', 'message' => 'Bitte melde dich an.']]);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}

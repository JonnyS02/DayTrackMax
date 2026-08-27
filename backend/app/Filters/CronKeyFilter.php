<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\DayTrack;

class CronKeyFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null): ?ResponseInterface
    {
        $configuredKey = config(DayTrack::class)->cronKey;
        if ($configuredKey === '') {
            return service('response')
                ->setStatusCode(503)
                ->setJSON(['error' => ['code' => 'CRON_NOT_CONFIGURED', 'message' => 'Der Cron-Zugang ist nicht konfiguriert.']]);
        }

        $providedKey = $request->getHeaderLine('X-Cron-Key');
        if ($providedKey !== '' && hash_equals($configuredKey, $providedKey)) {
            return null;
        }

        return service('response')
            ->setStatusCode(401)
            ->setJSON(['error' => ['code' => 'INVALID_CRON_KEY', 'message' => 'Der Cron-Zugang ist ungültig.']]);
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}

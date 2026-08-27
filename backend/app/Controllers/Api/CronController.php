<?php

namespace App\Controllers\Api;

use CodeIgniter\HTTP\ResponseInterface;

class CronController extends ApiController
{
    public function birthdayReminders(): ResponseInterface
    {
        return $this->action(function (): ResponseInterface {
            $deletedLogs = service('maintenanceService')->deleteExpiredLogs();
            $deletedThrottleEntries = service('maintenanceService')->clearThrottleCache();
            $result = service('birthdayService')->sendDueReminders();
            service('authService')->deleteExpiredTokens();

            return $this->data($result + [
                'deletedLogs' => $deletedLogs,
                'deletedThrottleEntries' => $deletedThrottleEntries,
            ]);
        });
    }
}

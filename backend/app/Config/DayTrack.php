<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class DayTrack extends BaseConfig
{
    public string $frontendURL = 'http://localhost:3000';
    public string $cronKey = '';
    public int $verificationTokenMinutes = 1440;
    public int $resetTokenMinutes = 60;
    public int $logRetentionDays = 30;
    public bool $demoAccountEnabled = false;
    public string $demoAccountName = 'Demo User';
    public string $demoAccountEmail = '';
    public string $demoAccountPassword = '';

    public function isDemoEmail(string $email): bool
    {
        $demoEmail = mb_strtolower(trim($this->demoAccountEmail));

        return $this->demoAccountEnabled
            && $demoEmail !== ''
            && $demoEmail === mb_strtolower(trim($email));
    }
}

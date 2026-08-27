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
}

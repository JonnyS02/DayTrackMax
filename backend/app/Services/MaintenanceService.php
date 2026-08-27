<?php

namespace App\Services;

use Config\DayTrack;
use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

class MaintenanceService
{
    public function __construct(private readonly DayTrack $config)
    {
    }

    public function deleteExpiredLogs(): int
    {
        if ($this->config->logRetentionDays < 1) {
            throw new RuntimeException('daytrack.logRetentionDays muss mindestens 1 betragen.');
        }

        $timezone = new DateTimeZone(config('App')->appTimezone);
        $cutoff = (new DateTimeImmutable('today', $timezone))->modify("-{$this->config->logRetentionDays} days");
        $deleted = 0;

        foreach (glob(WRITEPATH . 'logs/log-*.*') ?: [] as $path) {
            if (! is_file($path) || preg_match('/^log-(\d{4}-\d{2}-\d{2})\.(?:log|php)$/', basename($path), $matches) !== 1) {
                continue;
            }

            $logDate = DateTimeImmutable::createFromFormat('!Y-m-d', $matches[1], $timezone);
            if ($logDate === false || $logDate >= $cutoff) {
                continue;
            }

            if (@unlink($path)) {
                $deleted++;
            } else {
                log_message('warning', 'Logdatei konnte nicht gelöscht werden: {file}', ['file' => basename($path)]);
            }
        }

        return $deleted;
    }

    public function clearThrottleCache(): int
    {
        return service('cache')->deleteMatching('throttler_daytrack-*');
    }
}

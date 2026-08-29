<?php

namespace Config;

use App\Models\AuthTokenModel;
use App\Models\BirthdayModel;
use App\Models\UserModel;
use App\Services\AuthService;
use App\Services\BirthdayService;
use App\Services\MailService;
use App\Services\MaintenanceService;
use CodeIgniter\Config\BaseService;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of the
 * framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * This file holds any application-specific services, or service overrides
 * that you might need. An example has been included with the general
 * method format you should use for your service methods. For more examples,
 * see the core Services file at system/Config/Services.php.
 */
class Services extends BaseService
{
    public static function mailService(bool $getShared = true): MailService
    {
        if ($getShared) {
            return static::getSharedInstance('mailService');
        }

        return new MailService(static::email());
    }

    public static function authService(bool $getShared = true): AuthService
    {
        if ($getShared) {
            return static::getSharedInstance('authService');
        }

        return new AuthService(
            new UserModel(),
            new AuthTokenModel(),
            static::mailService(),
            static::session(),
            static::throttler(),
            db_connect(),
            config(DayTrack::class),
        );
    }

    public static function birthdayService(bool $getShared = true): BirthdayService
    {
        if ($getShared) {
            return static::getSharedInstance('birthdayService');
        }

        return new BirthdayService(
            new BirthdayModel(),
            static::mailService(),
            config(DayTrack::class),
        );
    }

    public static function maintenanceService(bool $getShared = true): MaintenanceService
    {
        if ($getShared) {
            return static::getSharedInstance('maintenanceService');
        }

        return new MaintenanceService(config(DayTrack::class));
    }
}

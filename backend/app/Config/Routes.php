<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', static fn () => service('response')->setJSON(['name' => 'DayTrack Max API']));

$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function (RouteCollection $routes): void {
    $routes->get('auth/csrf', 'AuthController::csrf');
    $routes->post('auth/register', 'AuthController::register');
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/email-verification/request', 'AuthController::requestEmailVerification');
    $routes->get('auth/email-verification/status', 'AuthController::emailVerificationStatus');
    $routes->post('auth/email-verification/confirm', 'AuthController::confirmEmailVerification');
    $routes->post('auth/password-reset/request', 'AuthController::requestPasswordReset');
    $routes->post('auth/password-reset/confirm', 'AuthController::confirmPasswordReset');

    $routes->group('', ['filter' => 'auth'], static function (RouteCollection $routes): void {
        $routes->post('auth/logout', 'AuthController::logout');
        $routes->get('profile', 'ProfileController::show');
        $routes->patch('profile', 'ProfileController::update');
        $routes->delete('profile/email-change', 'ProfileController::cancelEmailChange');
        $routes->post('profile/password-change/request', 'ProfileController::requestPasswordChange');
        $routes->delete('profile', 'ProfileController::delete');
        $routes->get('birthdays', 'BirthdayController::index');
        $routes->post('birthdays', 'BirthdayController::create');
        $routes->patch('birthdays/(:num)', 'BirthdayController::update/$1');
        $routes->delete('birthdays/(:num)', 'BirthdayController::delete/$1');
    });

    $routes->post('cron/birthday-reminders', 'CronController::birthdayReminders', ['filter' => 'cronKey']);
});

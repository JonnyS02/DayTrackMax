<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;
use CodeIgniter\Validation\StrictRules\CreditCardRules;
use CodeIgniter\Validation\StrictRules\FileRules;
use CodeIgniter\Validation\StrictRules\FormatRules;
use CodeIgniter\Validation\StrictRules\Rules;

class Validation extends BaseConfig
{
    // --------------------------------------------------------------------
    // Setup
    // --------------------------------------------------------------------

    /**
     * Stores the classes that contain the
     * rules that are available.
     *
     * @var list<string>
     */
    public array $ruleSets = [
        Rules::class,
        FormatRules::class,
        FileRules::class,
        CreditCardRules::class,
    ];

    /**
     * Specifies the views that are used to display the
     * errors.
     *
     * @var array<string, string>
     */
    public array $templates = [
        'list'   => 'CodeIgniter\Validation\Views\list',
        'single' => 'CodeIgniter\Validation\Views\single',
    ];

    // --------------------------------------------------------------------
    // Rules
    // --------------------------------------------------------------------

    public array $register = [
        'name' => ['label' => 'Name', 'rules' => ['required', 'max_length[120]']],
        'email' => ['label' => 'E-Mail', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'password' => ['label' => 'Passwort', 'rules' => ['required', 'min_length[10]', 'max_length[255]', 'regex_match[/[0-9]/]', 'regex_match[/[^a-zA-Z0-9]/]']],
        'passwordConfirmation' => ['label' => 'Passwortbestätigung', 'rules' => ['required', 'matches[password]']],
    ];

    public array $login = [
        'email' => ['label' => 'E-Mail', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'password' => ['label' => 'Passwort', 'rules' => ['required', 'max_length[255]']],
    ];

    public array $emailRequest = [
        'email' => ['label' => 'E-Mail', 'rules' => ['required', 'valid_email', 'max_length[254]']],
    ];

    public array $tokenRequest = [
        'token' => ['label' => 'Token', 'rules' => ['required', 'exact_length[64]', 'alpha_numeric']],
    ];

    public array $resetPassword = [
        'token' => ['label' => 'Token', 'rules' => ['required', 'exact_length[64]', 'alpha_numeric']],
        'password' => ['label' => 'Passwort', 'rules' => ['required', 'min_length[10]', 'max_length[255]', 'regex_match[/[0-9]/]', 'regex_match[/[^a-zA-Z0-9]/]']],
        'passwordConfirmation' => ['label' => 'Passwortbestätigung', 'rules' => ['required', 'matches[password]']],
    ];

    public array $profile = [
        'name' => ['label' => 'Name', 'rules' => ['required', 'max_length[120]']],
        'email' => ['label' => 'E-Mail', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'currentPassword' => ['label' => 'Aktuelles Passwort', 'rules' => ['permit_empty', 'max_length[255]']],
    ];

    public array $deleteAccount = [
        'password' => ['label' => 'Passwort', 'rules' => ['required', 'max_length[255]']],
    ];

    public array $birthday = [
        'firstName' => ['label' => 'Vorname', 'rules' => ['required', 'max_length[100]']],
        'lastName' => ['label' => 'Nachname', 'rules' => ['permit_empty', 'max_length[100]']],
        'birthDate' => ['label' => 'Geburtsdatum', 'rules' => ['required', 'valid_date[Y-m-d]']],
    ];
}

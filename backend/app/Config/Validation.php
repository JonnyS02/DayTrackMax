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
        'name' => ['label' => 'Fields.name', 'rules' => ['required', 'max_length[120]']],
        'email' => ['label' => 'Fields.email', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'password' => ['label' => 'Fields.password', 'rules' => ['required', 'min_length[10]', 'max_length[255]', 'regex_match[/[0-9]/]', 'regex_match[/[^a-zA-Z0-9]/]']],
        'passwordConfirmation' => ['label' => 'Fields.passwordConfirmation', 'rules' => ['required', 'matches[password]']],
        'locale' => ['label' => 'Fields.locale', 'rules' => ['required', 'in_list[de,en]']],
    ];

    public array $login = [
        'email' => ['label' => 'Fields.email', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'password' => ['label' => 'Fields.password', 'rules' => ['required', 'max_length[255]']],
    ];

    public array $emailRequest = [
        'email' => ['label' => 'Fields.email', 'rules' => ['required', 'valid_email', 'max_length[254]']],
    ];

    public array $tokenRequest = [
        'token' => ['label' => 'Fields.token', 'rules' => ['required', 'exact_length[64]', 'alpha_numeric']],
    ];

    public array $resetPassword = [
        'token' => ['label' => 'Fields.token', 'rules' => ['required', 'exact_length[64]', 'alpha_numeric']],
        'password' => ['label' => 'Fields.password', 'rules' => ['required', 'min_length[10]', 'max_length[255]', 'regex_match[/[0-9]/]', 'regex_match[/[^a-zA-Z0-9]/]']],
        'passwordConfirmation' => ['label' => 'Fields.passwordConfirmation', 'rules' => ['required', 'matches[password]']],
    ];

    public array $profile = [
        'name' => ['label' => 'Fields.name', 'rules' => ['required', 'max_length[120]']],
        'email' => ['label' => 'Fields.email', 'rules' => ['required', 'valid_email', 'max_length[254]']],
        'currentPassword' => ['label' => 'Fields.currentPassword', 'rules' => ['permit_empty', 'max_length[255]']],
    ];

    public array $locale = [
        'locale' => ['label' => 'Fields.locale', 'rules' => ['required', 'in_list[de,en]']],
    ];

    public array $deleteAccount = [
        'password' => ['label' => 'Fields.password', 'rules' => ['required', 'max_length[255]']],
    ];

    public array $birthday = [
        'firstName' => ['label' => 'Fields.firstName', 'rules' => ['required', 'max_length[100]']],
        'lastName' => ['label' => 'Fields.lastName', 'rules' => ['permit_empty', 'max_length[100]']],
        'birthDate' => ['label' => 'Fields.birthDate', 'rules' => ['required', 'valid_date[Y-m-d]']],
    ];
}

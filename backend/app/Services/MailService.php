<?php

namespace App\Services;

use CodeIgniter\Email\Email;
use RuntimeException;

class MailService
{
    public function __construct(private readonly Email $email)
    {
    }

    /**
     * @param array<string, string|int> $variables
     */
    public function send(string $template, string $recipient, string $subject, array $variables): void
    {
        $templatePath = APPPATH . 'Views/emails/' . $template . '.html';
        $html = is_file($templatePath) ? file_get_contents($templatePath) : false;

        if ($html === false) {
            throw new RuntimeException("E-Mail-Template {$template} wurde nicht gefunden.");
        }

        $replacements = [];
        foreach ($variables as $name => $value) {
            $replacements['{{' . $name . '}}'] = htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        $html = strtr($html, $replacements);
        if (preg_match('/{{[a-z0-9_]+}}/i', $html) === 1) {
            throw new RuntimeException("E-Mail-Template {$template} enthält nicht ersetzte Variablen.");
        }

        $this->email->clear(true);
        $this->email->setTo($recipient);
        $this->email->setSubject($subject);
        $this->email->setMessage($html);

        if (! $this->email->send()) {
            throw new RuntimeException('Die E-Mail konnte nicht versendet werden.');
        }
    }
}

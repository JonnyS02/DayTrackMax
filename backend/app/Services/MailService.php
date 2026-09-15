<?php

namespace App\Services;

use CodeIgniter\Email\Email;
use InvalidArgumentException;
use RuntimeException;

class MailService
{
    public function __construct(private readonly Email $email)
    {
    }

    /**
     * @param array<string, string|int> $variables
     */
    public function send(string $template, string $locale, string $recipient, string $subject, array $variables): void
    {
        if (! in_array($locale, config('App')->supportedLocales, true)) {
            throw new InvalidArgumentException('Unsupported email language.');
        }
        $templatePath = APPPATH . 'Views/emails/' . $locale . '/' . $template . '.html';
        $html = is_file($templatePath) ? file_get_contents($templatePath) : false;

        if ($html === false) {
            throw new RuntimeException("E-Mail-Template {$template} wurde nicht gefunden.");
        }

        preg_match_all('/{{([a-z0-9_]+)}}/i', $html, $matches);
        $replacements = [];
        foreach (array_unique($matches[1]) as $name) {
            if (! array_key_exists($name, $variables)) {
                throw new RuntimeException("E-Mail-Template {$template} enthält nicht ersetzte Variablen.");
            }
            $replacements['{{' . $name . '}}'] = htmlspecialchars((string) $variables[$name], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
        $html = strtr($html, $replacements);

        $this->email->clear(true);
        $this->email->setTo($recipient);
        $this->email->setSubject($subject);
        $this->email->setMessage($html);

        if (! $this->email->send()) {
            throw new RuntimeException('Die E-Mail konnte nicht versendet werden.');
        }
    }
}

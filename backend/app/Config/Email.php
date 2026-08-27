<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Email extends BaseConfig
{
    public string $fromEmail = '';
    public string $fromName = '';
    public string $userAgent = 'DayTrack Max';
    public string $protocol = 'mail';
    public string $mailType = 'html';
    public string $charset = 'UTF-8';
    public string $CRLF = "\r\n";
    public string $newline = "\r\n";
}

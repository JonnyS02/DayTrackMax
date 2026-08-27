<?php

namespace App\Exceptions;

use RuntimeException;

class ApiException extends RuntimeException
{
    /**
     * @param array<string, string> $fields
     */
    public function __construct(
        public readonly string $apiCode,
        string $message,
        public readonly int $status = 400,
        public readonly array $fields = [],
    ) {
        parent::__construct($message);
    }
}

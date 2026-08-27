<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Exceptions\ApiException;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;
use Throwable;

abstract class ApiController extends BaseController
{
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger): void
    {
        parent::initController($request, $response, $logger);
        $this->response
            ->setHeader('Cache-Control', 'private, no-store')
            ->setHeader('Pragma', 'no-cache');
    }

    /**
     * @return array<string, mixed>
     */
    protected function input(): array
    {
        $input = $this->request->getJSON(true);

        return is_array($input) ? $input : [];
    }

    protected function userId(): int
    {
        return (int) session()->get('user_id');
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    protected function trimInput(array $input, string ...$fields): array
    {
        foreach ($fields as $field) {
            if (isset($input[$field]) && is_string($input[$field])) {
                $input[$field] = trim($input[$field]);
            }
        }

        return $input;
    }

    protected function rateLimit(string $action, string $identity, int $capacity, int $seconds): ?ResponseInterface
    {
        $throttler = service('throttler');
        $key = 'daytrack-' . $action . '-' . hash('sha256', mb_strtolower(trim($identity)));

        if ($throttler->check($key, $capacity, $seconds)) {
            return null;
        }

        $retryAfter = $throttler->getTokenTime();

        return $this->response
            ->setHeader('Retry-After', (string) $retryAfter)
            ->setStatusCode(429)
            ->setJSON([
                'error' => [
                    'code' => 'RATE_LIMITED',
                    'message' => 'Zu viele Anfragen. Bitte versuche es später erneut.',
                ],
            ]);
    }

    protected function data(mixed $data, int $status = 200): ResponseInterface
    {
        return $this->response->setStatusCode($status)->setJSON(['data' => $data]);
    }

    /**
     * @param array<string, string> $fields
     */
    protected function validationFailure(array $fields): ResponseInterface
    {
        return $this->response->setStatusCode(422)->setJSON([
            'error' => [
                'code' => 'VALIDATION_FAILED',
                'message' => 'Bitte prüfe deine Eingaben.',
                'fields' => $fields,
            ],
        ]);
    }

    protected function action(callable $callback): ResponseInterface
    {
        try {
            return $callback();
        } catch (ApiException $exception) {
            $error = ['code' => $exception->apiCode, 'message' => $exception->getMessage()];
            if ($exception->fields !== []) {
                $error['fields'] = $exception->fields;
            }

            return $this->response->setStatusCode($exception->status)->setJSON(['error' => $error]);
        } catch (Throwable $exception) {
            log_message('error', '{type}: {message}', ['type' => $exception::class, 'message' => $exception->getMessage()]);

            return $this->response->setStatusCode(500)->setJSON([
                'error' => ['code' => 'SERVER_ERROR', 'message' => 'Die Anfrage konnte nicht verarbeitet werden.'],
            ]);
        }
    }
}

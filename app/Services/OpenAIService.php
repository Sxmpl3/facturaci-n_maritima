<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OpenAIService
{
    protected string $apiKey;
    protected string $model;
    protected string $endpoint = 'https://api.openai.com/v1/chat/completions';

    public function __construct()
    {
        $this->apiKey = (string) config('services.openai.key');
        $this->model  = (string) config('services.openai.model', 'gpt-5.6-luna');

        if ($this->apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY no configurada.');
        }
    }

    /**
     * Chat con salida JSON estructurada.
     *
     * @param  array<int, array<string, mixed>>  $messages
     * @return array<string, mixed>
     */
    public function json(array $messages, ?array $schema = null): array
    {
        $payload = [
            'model'    => $this->model,
            'messages' => $messages,
        ];

        if ($schema) {
            $payload['response_format'] = [
                'type'        => 'json_schema',
                'json_schema' => [
                    'name'   => 'wixia_output',
                    'strict' => true,
                    'schema' => $schema,
                ],
            ];
        } else {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(240)
            ->connectTimeout(10)
            ->acceptJson()
            ->asJson()
            ->post($this->endpoint, $payload);

        if ($response->failed()) {
            Log::warning('OpenAI request failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new RuntimeException('OpenAI error: '.$response->status().' — '.$response->body());
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $decoded = json_decode((string) $content, true);

        if (! is_array($decoded)) {
            throw new RuntimeException('Respuesta OpenAI no es JSON válido: '.$content);
        }

        return $decoded;
    }
}

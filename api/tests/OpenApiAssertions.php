<?php

use Illuminate\Testing\TestResponse;
use Symfony\Component\Process\Process;

function assertOpenApiResponse(TestResponse $response, string $method, string $path, bool $example = false): void
{
    $headers = [];
    foreach ($response->headers->all() as $key => $values) {
        $headers[strtolower($key)] = implode(', ', $values);
    }
    $process = new Process(['node', 'api/tools/validate-contract.mjs'], dirname(base_path()));
    $process->setInput(json_encode(['method' => $method, 'path' => $path, 'status' => $response->getStatusCode(), 'content' => $response->getContent(), 'headers' => $headers, 'example' => $example], JSON_THROW_ON_ERROR));
    $process->mustRun();
    expect(trim($process->getOutput()))->toBe('Contract response valid');
}

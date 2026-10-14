<?php

namespace Tests\Fixtures\Rest;

use CaliCastle\Cuid;

// Test-only in-memory resource state, not an implementation for real payments.
class ExampleStore
{
    public array $records = [];

    private array $keys = [];

    public function create(string $owner, string $key, array $payload): array
    {
        $scope = $owner.'|'.$key;
        $fingerprint = hash('sha256', json_encode([$payload['name'], (int) $payload['amount']], JSON_THROW_ON_ERROR));
        if (isset($this->keys[$scope])) {
            abort_if($this->keys[$scope]['fingerprint'] !== $fingerprint, 409, 'Idempotency key was already used for a different request.');

            return $this->keys[$scope]['response'];
        }
        $row = ['id' => Cuid::make(), 'name' => $payload['name'], 'amount' => (int) $payload['amount'], 'status' => 'pending', 'owner_id' => $owner, 'private_notes' => 'never public'];
        $this->records[$row['id']] = $row;
        $this->keys[$scope] = ['fingerprint' => $fingerprint, 'response' => $row];

        return $row;
    }

    public function find(string $id, string $owner): array
    {
        abort_unless(isset($this->records[$id]), 404, 'Resource not found.');
        $row = $this->records[$id];
        abort_unless($row['owner_id'] === $owner, 403, 'Access denied.');

        return $row;
    }
}

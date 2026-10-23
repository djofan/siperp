<?php

namespace App\Contracts\Modules;

use Illuminate\Http\Request;

interface ParticipantModule
{
    public function authorize(Request $request): void;
    public function publicSetup(Request $request): void;
    public function extraRules(): array;
    public function codeFormat(): array;
    public function userIdFor(string $profileId): string;
    public function createProfile(string $userId, array $data, string $code): void;
    public function updateProfile(string $profileId, string $userId, array $data): void;
    public function removeProfile(string $profileId, string $userId): void;
    public function hasMembership(string $userId): bool;
}

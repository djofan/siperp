<?php

namespace App\Contracts\Modules;

use Illuminate\Http\Request;

interface ModuleSession
{
    public function credentialField(): string;
    public function resolveLogin(string $identifier): array;
    public function viewer(Request $request, array $session): array;
    public function redirect(array $session, ?object $membership): string;
    public function available(): bool;
    public function preferredPanel(array $access): ?string;
}

<?php

namespace App\Support;

use App\Contracts\Payments\PaymentModule;

class PaymentModules
{
    private array $adapters = [];

    public function register(string $slug, string $adapter): void
    {
        if (isset($this->adapters[$slug])) throw new \LogicException('Duplicate payment module registration: '.$slug);
        $this->adapters[$slug] = $adapter;
    }

    public function has(string $slug): bool { return isset($this->adapters[$slug]); }

    public function for(string $slug): PaymentModule
    {
        abort_unless($this->has($slug), 404, 'Modul pembayaran tidak tersedia.');
        $adapter = app($this->adapters[$slug]);
        if (! $adapter instanceof PaymentModule) throw new \LogicException('Invalid payment adapter.');
        return $adapter;
    }
}

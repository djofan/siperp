<?php

return [
    'gateway' => env('PAYMENT_GATEWAY', 'simulation'),
    'public_url' => env('PAYMENT_PUBLIC_URL', 'http://localhost:3000'),
    'api_url' => env('PAYMENT_API_URL', rtrim(env('APP_URL', 'http://localhost:8000'), '/').'/api/v1'),
    'ipaymu' => [
        'api_key' => env('IPAYMU_API_KEY'),
        'va' => env('IPAYMU_VA'),
        'base_url' => env('IPAYMU_BASE_URL', 'https://sandbox.ipaymu.com/api/v2'),
    ],
    'resend' => ['key' => env('RESEND_API_KEY'), 'from' => env('RESEND_FROM_EMAIL')],
];

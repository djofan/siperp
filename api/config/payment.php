<?php

return [
    'gateway' => env('PAYMENT_GATEWAY', 'simulation'),
    'public_url' => env('PAYMENT_PUBLIC_URL', 'http://localhost:3000'),
    'midtrans' => ['server_key' => env('MIDTRANS_SERVER_KEY'), 'merchant_id' => env('MIDTRANS_MERCHANT_ID')],
    'resend' => ['key' => env('RESEND_API_KEY'), 'from' => env('RESEND_FROM_EMAIL')],
];

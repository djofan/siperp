<?php

return [
    'origins' => array_values(array_filter(array_map(fn ($origin) => rtrim(trim($origin), '/'), explode(',', env('FRONTEND_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000'))))),
    'secure_cookie' => (bool) env('SESSION_SECURE_COOKIE', env('APP_ENV') === 'production'),
    'browser_session_token_minutes' => 720,
    'remembered_session_minutes' => 43200,
    'pwa_session_minutes' => 43200,
];

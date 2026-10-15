<?php

return [
    'origins' => array_values(array_filter(array_map(fn ($origin) => rtrim(trim($origin), '/'), explode(',', env('FRONTEND_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000'))))),
    'secure_cookie' => (bool) env('SESSION_SECURE_COOKIE', env('APP_ENV') === 'production'),
];

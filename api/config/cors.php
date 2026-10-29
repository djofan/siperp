<?php

return ['paths' => ['api/v1/*'], 'allowed_methods' => ['*'], 'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')))), 'allowed_origins_patterns' => [], 'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Idempotency-Key'], 'exposed_headers' => [], 'max_age' => 0, 'supports_credentials' => false];

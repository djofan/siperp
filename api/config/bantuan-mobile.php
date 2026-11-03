<?php

return [
    'credentials' => env('BANTUAN_FIREBASE_CREDENTIALS'),
    // Firebase Web configuration and VAPID PUBLIC key, never the service-account JSON.
    'web' => [
        'apiKey' => env('BANTUAN_FIREBASE_WEB_API_KEY'),
        'projectId' => env('BANTUAN_FIREBASE_WEB_PROJECT_ID'),
        'messagingSenderId' => env('BANTUAN_FIREBASE_WEB_SENDER_ID'),
        'appId' => env('BANTUAN_FIREBASE_WEB_APP_ID'),
        'vapidKey' => env('BANTUAN_FIREBASE_WEB_VAPID_KEY'),
    ],
];

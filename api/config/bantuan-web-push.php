<?php

return [
    'key_file' => env('BANTUAN_WEB_PUSH_KEY_FILE') ?: storage_path('app/private/bantuan-web-push/vapid.json'),
    'subject' => env('BANTUAN_WEB_PUSH_SUBJECT', 'https://erp.lazsip.or.id'),
];

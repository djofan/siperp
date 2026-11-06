<?php

return [
    'directory' => env('ERP_BACKUP_DIR', storage_path('app/backups')),
    'key' => env('ERP_BACKUP_KEY'),
    'max_bytes' => 256 * 1024 * 1024,
    'restore_database_url' => env('ERP_RESTORE_DATABASE_URL'),
];

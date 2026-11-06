<?php

return [
    'location_provider' => env('BANTUAN_LOCATION_PROVIDER', 'geoapify'),
    'geoapify_api_key' => env('GEOAPIFY_API_KEY', ''),
    'geocoder_url' => env('BANTUAN_GEOCODER_URL', 'https://nominatim.openstreetmap.org/search'),
    'router_url' => env('BANTUAN_ROUTER_URL', 'https://router.project-osrm.org/route/v1/driving'),
    'whatsapp_enabled' => env('BANTUAN_WHATSAPP_ENABLED', false),
    'fonnte_token' => env('BANTUAN_FONNTE_TOKEN', ''),
    'public_url' => env('BANTUAN_PUBLIC_URL', ''),
];

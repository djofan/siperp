<?php

namespace App\Modules\Bantuan\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;

class PhotoLocation
{
    public static function fromRequest(Request $request): ?string
    {
        $data = $request->validate([
            'location' => 'sometimes|required|array:latitude,longitude,source,accuracy',
            'location.latitude' => 'required_with:location|numeric|between:-90,90',
            'location.longitude' => 'required_with:location|numeric|between:-180,180',
            'location.source' => 'required_with:location|in:exif,device',
            'location.accuracy' => 'nullable|numeric|min:0|max:10000000',
        ]);
        if (! isset($data['location'])) {
            return null;
        }
        $location = $data['location'];

        return Crypt::encryptString(json_encode([
            'latitude' => round((float) $location['latitude'], 7),
            'longitude' => round((float) $location['longitude'], 7),
            'source' => $location['source'],
            'accuracy' => isset($location['accuracy']) ? (float) $location['accuracy'] : null,
        ], JSON_THROW_ON_ERROR));
    }

    public static function present(?string $value): ?array
    {
        return $value ? json_decode(Crypt::decryptString($value), true, 512, JSON_THROW_ON_ERROR) : null;
    }
}

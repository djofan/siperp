<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\SurveyGeocoder;
use Illuminate\Http\Request;

class SurveyLocationController
{
    public function route(Request $request, string $id, Access $access, \App\Modules\Bantuan\Services\SurveyRouter $router)
    {
        $access->allow($request, ['call_center', 'verifier']);
        $row = $access->find($request, $id);
        abort_unless($access->sensitive($request, $row) && ($access->has($request, ['admin', 'call_center']) || $row->verifier_id === $request->user()->id), 403);
        $points = $request->validate([
            'origin.latitude' => 'required|numeric|between:-90,90', 'origin.longitude' => 'required|numeric|between:-180,180',
            'destination.latitude' => 'required|numeric|between:-90,90', 'destination.longitude' => 'required|numeric|between:-180,180',
        ]);
        return response()->json(['data' => $router->route($points['origin'], $points['destination'])]);
    }

    public function search(Request $request, string $id, Access $access, SurveyGeocoder $geocoder)
    {
        $access->allow($request, ['call_center', 'verifier']);
        $row = $access->find($request, $id);
        abort_unless($access->sensitive($request, $row), 403);
        abort_unless($access->has($request, ['admin', 'call_center']) || $row->verifier_id === $request->user()->id, 403, 'Fitur jarak hanya tersedia untuk verifikator yang ditugaskan.');
        $data = $request->validate(['origin' => 'sometimes|required|string|min:3|max:500']);
        // Destination comes from the authorized record, never a client-supplied applicant.
        $address = $data['origin'] ?? $row->survey_location['address'] ?? implode(', ', array_filter(array_map(
            fn ($key) => trim((string) ($row->applicant[$key] ?? '')),
            ['street', 'village', 'district', 'city']
        )));
        abort_if($address === '', 422, 'Alamat pemohon belum dilengkapi.');
        return response()->json(['data' => $geocoder->search($address)]);
    }
}

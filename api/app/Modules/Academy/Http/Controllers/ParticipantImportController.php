<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Http\Requests\ImportParticipantsRequest;
use App\Modules\Academy\Http\Resources\ParticipantImportResource;
use App\Modules\Academy\Services\ImportParticipants;
use Illuminate\Http\JsonResponse;

class ParticipantImportController
{
    public function store(ImportParticipantsRequest $request, ImportParticipants $import): JsonResponse
    {
        return (new ParticipantImportResource($import->run($request->validated())))->response()
            ->header('Cache-Control', 'no-store, private');
    }
}

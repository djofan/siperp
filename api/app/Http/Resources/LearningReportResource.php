<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LearningReportResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $payload = $this->resource;
        $payload['data'] = array_map(function ($item) {
            $row = (array) $item;
            foreach (['active', 'assigned', 'due', 'submitted', 'approved', 'pending', 'rejected', 'on_time', 'late', 'attempts', 'quizzes', 'missing', 'overdue', 'due_submitted'] as $field) $row[$field] = (int) $row[$field];
            foreach (['score', 'completion'] as $field) $row[$field] = $row[$field] === null ? null : round((float) $row[$field], 1);
            return $row;
        }, $payload['data']);
        $summary = (array) $payload['summary'];
        foreach ($summary as $key => $value) $summary[$key] = $key === 'score' ? ($value === null ? null : round((float) $value, 1)) : (int) $value;
        $payload['summary'] = $summary;
        return $payload;
    }
}

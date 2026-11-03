<?php

namespace App\Modules\Sarsip\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'headline' => $this->headline,
            'description' => $this->description,
            'contact' => $this->contact,
            'heroImage' => $this->heroImage,
        ];
    }
}

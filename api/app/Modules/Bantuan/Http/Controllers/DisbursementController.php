<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\{Access, Workflow};
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class DisbursementController
{
    public function __invoke(Request $request, Access $access, Workflow $workflow)
    {
        $access->allow($request, ['treasurer']);
        $input = $request->validate([
            'transferDate' => 'required|date|before_or_equal:today',
            'items' => 'required|array|min:1|max:50',
            'items.*.id' => 'required|uuid|distinct:ignore_case',
            'items.*.version' => 'required|integer|min:1',
            'items.*.transferAmount' => 'required|integer|min:1',
            'items.*.bank' => 'required|string|max:191',
            'items.*.account' => 'required|string|max:191',
            'items.*.recipientName' => 'required|string|max:191',
            'items.*.recipientRelationship' => 'required|string|max:191',
        ]);

        $results = DB::transaction(function () use ($request, $input, $access, $workflow) {
            $items = collect($input['items'])->sortBy('id');
            // Acquire every application lock in a stable order before performing transitions.
            foreach ($items as $item) $access->find($request, $item['id'], true);
            $results = [];
            foreach ($items as $item) {
                // Cloning preserves the authenticated user resolver and module attributes.
                $copy = clone $request;
                $copy->replace([...$item, 'transferDate' => $input['transferDate']]);
                $row = $workflow->perform($copy, $item['id'], 'disburse');
                $results[] = ['id' => $row->id, 'status' => $row->status, 'version' => $row->version];
            }
            return $results;
        }, 3);

        return (new JsonResource(['count' => count($results), 'items' => $results]))
            ->response()->header('Cache-Control', 'no-store, private');
    }
}

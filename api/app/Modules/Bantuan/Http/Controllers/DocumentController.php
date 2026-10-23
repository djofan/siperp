<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentController
{
    public function destroy(Request $request, string $id, Access $access, Journal $journal)
    {
        return DB::transaction(function () use ($request, $id, $access, $journal) {
            $doc = DB::table('bantuan_documents')->where('id', $id)->whereNull('deleted_at')->firstOrFail();
            $row = $access->find($request, $doc->application_id, true);
            abort_if($doc->used_at, 409, 'Bukti yang sudah digunakan tidak dapat dihapus.');
            $role = $access->role($request);
            $kind = $doc->kind;
            $stage = match (true) {
                in_array($kind, ['face', 'ktp'], true) => in_array($row->status, ['draft', 'needs_data', 'screening'], true),
                str_starts_with($kind, 'survey_') || $kind === 'sktm' => $row->status === 'survey_assigned',
                $kind === 'transfer' => $row->status === 'fund_approved',
                $kind === 'return' => in_array($row->status, ['disbursed', 'delivery_failed'], true),
                default => $row->status === 'disbursed',
            };
            abort_unless($stage, 409, 'Foto sudah terkunci pada tahap ini.');
            abort_unless($role === 'admin' || $doc->uploaded_by === $request->user()->id, 403, 'Hanya pengunggah atau Admin dapat menghapus foto.');
            if ($role !== 'admin') {
                $allowed = match (true) {
                    in_array($kind, ['face', 'ktp'], true) => $role === 'call_center' || ($role === 'verifier' && $row->created_by === $request->user()->id),
                    str_starts_with($kind, 'survey_') || $kind === 'sktm' => $role === 'verifier' && $row->verifier_id === $request->user()->id,
                    in_array($kind, ['transfer', 'return'], true) => $role === 'treasurer',
                    default => ($role === 'verifier' && $row->distributor_id === $request->user()->id) || ($role === 'treasurer' && $row->distribution_type === 'direct'),
                };
                abort_unless($allowed, 403);
            }
            // Retain encrypted bytes for audit/recovery; never erase evidence in a UI action.
            DB::table('bantuan_documents')->where('id', $id)->update(['deleted_at' => now()]);
            $journal->record($request, $row, 'remove_document', $row->status, ['documentId' => $id, 'kind' => $kind]);
            return response()->json(['ok' => true]);
        });
    }
}

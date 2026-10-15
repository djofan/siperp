<?php

namespace App\Modules\Payment\Http\Controllers;

use App\Modules\Payment\Models\PaymentDestinationAccount;
use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DestinationAccountController
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);

        return response()->json(PaymentDestinationAccount::orderBy('module_source')->orderBy('fund_type')->orderBy('id')->paginate($request->integer('per_page', 100)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['moduleSource' => 'required|in:lazsip,sarsip', 'fundType' => 'required|in:infak,zakat,donasi', 'bankName' => 'required|string|max:191', 'accountNumber' => 'required|string|max:191', 'accountName' => 'required|string|max:191']);
        abort_unless($data['moduleSource'] === 'sarsip' ? $data['fundType'] === 'donasi' : in_array($data['fundType'], ['infak', 'zakat'], true), 422, 'Jenis dana tidak sesuai modul.');
        $row = new PaymentDestinationAccount;
        $row->forceFill($data)->save();

        return response()->json(['ok' => true, 'id' => $row->id, 'data' => $row], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function destroy(string $id): JsonResponse
    {
        DB::transaction(function () use ($id): void {
            $row = PaymentDestinationAccount::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if(PaymentTransaction::where('destination_account_id', $id)->exists(), 409, 'Rekening ini sudah dipakai transaksi dan tidak bisa dihapus.');
            $row->delete();
        });

        return response()->json(['ok' => true]);
    }
}

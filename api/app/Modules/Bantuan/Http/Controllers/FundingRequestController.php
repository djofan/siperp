<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\FundingRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FundingRequestController
{
    public function index(Request $request, FundingRequests $service)
    {
        $query = $service->visible($request);
        $filters = $request->validate(['status' => 'nullable|in:submitted,approved,rejected', 'search' => 'nullable|string|max:191', 'page' => 'sometimes|integer|min:1']);
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['search'])) {
            $query->where(fn ($q) => $q->where('title', 'like', '%'.$filters['search'].'%')->orWhere('number', 'like', '%'.$filters['search'].'%'));
        }
        $summary = ['count' => (clone $query)->count(), 'totalAmount' => (int) (clone $query)->sum('total_amount')];
        $page = $query->with('items.application')->latest()->orderBy('id')->paginate(12);

        return response()->json(['data' => $page->getCollection()->map(fn ($row) => $service->payload($row)),
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'summary' => $summary]);
    }

    public function ready(Request $request, Access $access)
    {
        $access->allow($request, ['fund_requester']);
        $filters = $request->validate(['search' => 'nullable|string|max:191', 'program' => 'nullable|string|max:191',
            'region' => 'nullable|string|max:191', 'page' => 'sometimes|integer|min:1']);
        $query = $access->scope(Application::query(), $request)->where('status', 'fund_ready')->where('amount', '>', 0)
            ->whereNotIn('id', fn ($q) => $q->select('active_application_id')->from('bantuan_funding_request_items')->whereNotNull('active_application_id'));
        foreach (['program', 'region'] as $key) {
            if (! empty($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }
        if (! empty($filters['search'])) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$filters['search'].'%')->orWhere('number', 'like', '%'.$filters['search'].'%'));
        }
        $summary = ['count' => (clone $query)->count(), 'totalAmount' => (int) (clone $query)->sum('amount')];
        $page = $query->orderBy('created_at')->orderBy('id')->paginate(50, ['id', 'number', 'name', 'program', 'region', 'amount', 'version', 'status', 'applicant', 'survey', 'distributor_id', 'distribution_type']);
        $distributors = DB::table('users')->whereIn('id', $page->getCollection()->pluck('distributor_id')->filter()->unique())->pluck('name', 'id');

        return response()->json(['data' => $page->getCollection()->map(fn ($row) => [
            ...$row->only(['id', 'number', 'name', 'program', 'region', 'amount', 'version', 'status']),
            ...FundingRequests::descriptionFields($row),
            'distributorName' => $row->distribution_type === 'direct' ? 'Bendahara langsung'
                : ($distributors[$row->distributor_id] ?? 'Belum ditetapkan'),
        ]), 'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'summary' => $summary]);
    }

    public function show(Request $request, string $id, FundingRequests $service)
    {
        return response()->json(['data' => $service->payload($service->visible($request)->findOrFail($id))]);
    }

    public function store(Request $request, FundingRequests $service)
    {
        return response()->json(['data' => $service->payload($service->create($request))], 201);
    }

    public function decide(Request $request, string $id, FundingRequests $service)
    {
        return response()->json(['data' => $service->payload($service->decide($request, $id))]);
    }
}

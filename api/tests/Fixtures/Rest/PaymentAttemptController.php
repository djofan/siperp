<?php

namespace Tests\Fixtures\Rest;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpFoundation\Response;

class PaymentAttemptController
{
    public function __construct(private ExampleStore $store) {}

    public function index(IndexRequest $request): AnonymousResourceCollection
    {
        $rows = collect($this->store->records)->where('owner_id', $request->user()->getAuthIdentifier());
        if ($status = $request->validated('filter.status')) {
            $rows = $rows->where('status', $status);
        }
        if ($q = $request->validated('q')) {
            $rows = $rows->filter(fn (array $row) => str_contains(strtolower($row['name']), strtolower($q)));
        }
        $sort = $request->validated('sort', 'name');
        $rows = $rows->sortBy([[ltrim($sort, '-'), str_starts_with($sort, '-') ? 'desc' : 'asc'], ['id', 'asc']])->values();
        $paginator = new LengthAwarePaginator($rows->forPage($request->pageNumber(), $request->perPage())->values(), $rows->count(), $request->perPage(), $request->pageNumber(), ['path' => $request->url()]);
        $paginator->appends($request->validated());

        return PaymentAttemptResource::collection($paginator);
    }

    public function store(StoreRequest $request): JsonResponse
    {
        $row = $this->store->create((string) $request->user()->getAuthIdentifier(), $request->validated('idempotency_key'), $request->safe()->only(['name', 'amount']));

        return (new PaymentAttemptResource($row))->response()->setStatusCode(201)->header('Location', route('examples.payment-attempts.show', $row['id']));
    }

    public function show(Request $request, string $payment_attempt): PaymentAttemptResource
    {
        return new PaymentAttemptResource($this->store->find($payment_attempt, (string) $request->user()->getAuthIdentifier()));
    }

    public function update(UpdateRequest $request, string $payment_attempt): PaymentAttemptResource
    {
        $row = $this->store->find($payment_attempt, (string) $request->user()->getAuthIdentifier());
        $row = array_merge($row, $request->safe()->only(['name', 'amount', 'status']));
        $this->store->records[$payment_attempt] = $row;

        return new PaymentAttemptResource($row);
    }

    public function destroy(Request $request, string $payment_attempt): Response
    {
        $this->store->find($payment_attempt, (string) $request->user()->getAuthIdentifier());
        unset($this->store->records[$payment_attempt]);

        // 204 has no representation; Resource is used for all responses with a JSON body.
        return response()->noContent();
    }
}

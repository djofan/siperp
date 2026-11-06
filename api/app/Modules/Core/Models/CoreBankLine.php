<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoreBankLine extends DomainModel
{
    protected $table = 'core_bank_lines';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['accountId' => 'account_id', 'bookedAt' => 'booked_at', 'paymentId' => 'payment_id', 'expenseId' => 'expense_id', 'matchNote' => 'match_note', 'matchedBy' => 'matched_by', 'matchedAt' => 'matched_at', 'createdAt' => 'created_at'];

    protected $casts = ['booked_at' => 'immutable_datetime', 'amount' => 'integer', 'matched_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return BelongsTo<CoreExpense, $this> */
    public function expense(): BelongsTo
    {
        return $this->belongsTo(CoreExpense::class, 'expense_id', 'id');
    }
}

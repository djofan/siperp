<?php

namespace App\Modules\Core\Models;

use App\Support\DomainModel;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CoreExpense extends DomainModel
{
    protected $table = 'core_expenses';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['accountId' => 'account_id', 'moduleSource' => 'module_source', 'fundType' => 'fund_type', 'spentAt' => 'spent_at', 'createdBy' => 'created_by', 'createdAt' => 'created_at'];

    protected $casts = ['amount' => 'integer', 'spent_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];

    /** @return HasOne<CoreBankLine, $this> */
    public function bankLine(): HasOne
    {
        return $this->hasOne(CoreBankLine::class, 'expense_id', 'id');
    }
}

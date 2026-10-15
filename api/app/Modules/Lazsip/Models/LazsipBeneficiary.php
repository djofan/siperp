<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipBeneficiary extends DomainModel
{
    protected $table = 'lazsip_beneficiaries';

    protected $primaryKey = 'id';

    public $timestamps = false;

    const CREATED_AT = 'created_at';

    const UPDATED_AT = null;

    protected array $fieldMap = ['problemFaced' => 'problem_faced', 'birthDate' => 'birth_date', 'referralSource' => 'referral_source', 'aidType' => 'aid_type', 'amountReceived' => 'amount_received', 'verifierName' => 'verifier_name', 'verifierArea' => 'verifier_area', 'maritalStatus' => 'marital_status', 'monthlyIncome' => 'monthly_income', 'dependentsCount' => 'dependents_count', 'dependentsDetail' => 'dependents_detail', 'isPinned' => 'is_pinned', 'createdAt' => 'created_at'];

    protected $casts = ['birth_date' => 'immutable_datetime', 'age' => 'integer', 'amount_received' => 'integer', 'monthly_income' => 'integer', 'dependents_count' => 'integer', 'is_pinned' => 'boolean', 'created_at' => 'immutable_datetime'];

    protected $hidden = [];
}

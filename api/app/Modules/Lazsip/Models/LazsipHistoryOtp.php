<?php

namespace App\Modules\Lazsip\Models;

use App\Support\DomainModel;

class LazsipHistoryOtp extends DomainModel
{
    protected $table = 'lazsip_history_otp';

    protected $primaryKey = 'email_key';

    public $timestamps = false;

    const CREATED_AT = null;

    const UPDATED_AT = null;

    protected array $fieldMap = ['emailKey' => 'email_key', 'challengeId' => 'challenge_id', 'codeHash' => 'code_hash', 'expiresAt' => 'expires_at', 'sendCount' => 'send_count', 'sentAt' => 'sent_at', 'windowStart' => 'window_start'];

    protected $casts = ['expires_at' => 'immutable_datetime', 'attempts' => 'integer', 'send_count' => 'integer', 'sent_at' => 'immutable_datetime', 'window_start' => 'immutable_datetime'];

    protected $hidden = [];
}

<?php

use App\Modules\Academy\Providers\AcademyServiceProvider;
use App\Modules\Core\Providers\CoreServiceProvider;
use App\Modules\Lazsip\Providers\LazsipServiceProvider;
use App\Modules\Ojol\Providers\OjolServiceProvider;
use App\Modules\Payment\Providers\PaymentServiceProvider;
use App\Modules\Sarsip\Providers\SarsipServiceProvider;
use App\Modules\Sip\Providers\SipServiceProvider;
use App\Modules\Tanwir\Providers\TanwirServiceProvider;
use App\Modules\Teknisi\Providers\TeknisiServiceProvider;

return ['providers' => [
    CoreServiceProvider::class,
    PaymentServiceProvider::class,
    LazsipServiceProvider::class,
    SipServiceProvider::class,
    AcademyServiceProvider::class,
    SarsipServiceProvider::class,
    TanwirServiceProvider::class,
    OjolServiceProvider::class,
    TeknisiServiceProvider::class,
]];

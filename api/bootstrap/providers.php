<?php

use App\Providers\AppServiceProvider;
use App\Providers\ModuleServiceProvider;

return [AppServiceProvider::class, ModuleServiceProvider::class, \App\Modules\Bantuan\Providers\MobilePushServiceProvider::class];

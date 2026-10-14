<?php

use Tests\TestCase;

pest()->extend(TestCase::class)->in('Feature');
require_once __DIR__.'/NextAuthFixture.php';
require_once __DIR__.'/OpenApiAssertions.php';

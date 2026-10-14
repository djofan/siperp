<?php

return ['driver' => 'bcrypt', 'bcrypt' => ['rounds' => (int) env('BCRYPT_ROUNDS', 12), 'verify' => (bool) env('HASH_VERIFY', false)], 'rehash_on_login' => false];

<?php

namespace App\Modules\Bantuan\Services;

class SantunanPrograms
{
    public const CATEGORIES = ['widow', 'orphan', 'foster_child', 'tahfidz', 'education', 'general'];

    public const NON_ROUTINE = ['orphan', 'tahfidz', 'education', 'general'];

    public static function supports(string $frequency, string $category): bool
    {
        return in_array($category, self::CATEGORIES, true)
            && ($frequency === 'routine' || ($frequency === 'non_routine' && in_array($category, self::NON_ROUTINE, true)));
    }
}

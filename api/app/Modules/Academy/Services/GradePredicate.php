<?php

namespace App\Modules\Academy\Services;

class GradePredicate
{
    public static function forScore(float $score): string
    {
        return match (true) {
            $score > 95 => 'Mumtaz Murtafi',
            $score > 85 => 'Mumtaz',
            $score > 70 => 'Jayyid Jiddan',
            $score > 50 => 'Jayyid',
            default => 'Maqbul',
        };
    }
}

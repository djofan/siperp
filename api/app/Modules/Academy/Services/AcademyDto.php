<?php

namespace App\Modules\Academy\Services;

class AcademyDto
{
    public static function make($value): array
    {
        $data = is_array($value) ? $value : $value->toArray();
        foreach ($data as $key => $item) {
            if (str_ends_with($key, '_count')) {
                $name = substr($key, 0, -6);
                $data['_count'][$name] = (int) $item;
                unset($data[$key]);
            } elseif (is_array($item)) {
                $data[$key] = self::make($item);
            }
        }

        return $data;
    }

    public static function page($query, int $requested, int $size = 20): array
    {
        $total = (clone $query)->count();
        $pages = max(1, (int) ceil($total / $size));
        $page = min(max(1, $requested), $pages);

        return ['items' => $query->skip(($page - 1) * $size)->take($size)->get()->map(fn ($row) => self::make($row)), 'page' => $page, 'pages' => $pages, 'total' => $total];
    }
}

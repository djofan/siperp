<?php

namespace App\Modules\Sip\Http\Controllers;

use App\Modules\Sip\Models\SipLaporan;
use App\Modules\Sip\Models\SipNews;
use App\Modules\Sip\Models\SipPenyaluranBantuan;
use App\Modules\Sip\Models\SipProgramBantuan;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class DashboardController
{
    public function __invoke(): JsonResponse
    {
        $now = CarbonImmutable::now('Asia/Jakarta');
        $dates = SipPenyaluranBantuan::pluck('date');
        $years = [];
        foreach ($dates as $date) {
            $year = CarbonImmutable::parse($date, 'UTC')->setTimezone('Asia/Jakarta')->year;
            $years[$year] = ($years[$year] ?? 0) + 1;
        }
        $perYear = [];
        if ($years) {
            for ($year = min(array_keys($years)); $year <= max($now->year, ...array_keys($years)); $year++) {
                $perYear[] = ['year' => $year, 'count' => $years[$year] ?? 0];
            }
        }
        $months = [];
        $uploaded = SipLaporan::where('type', 'bulanan')->get(['period_year', 'period_month'])->map(fn ($row) => $row->periodYear.'-'.$row->periodMonth)->all();
        for ($offset = 12; $offset >= 1; $offset--) {
            $date = $now->startOfMonth()->subMonths($offset);
            $months[] = ['year' => $date->year, 'month' => $date->month, 'uploaded' => in_array($date->year.'-'.$date->month, $uploaded, true)];
        }

        return response()->json(['data' => [
            'counts' => ['programCount' => SipProgramBantuan::count(), 'publishedNewsCount' => SipNews::where('status', 'published')->count(), 'penyaluranCount' => SipPenyaluranBantuan::count(), 'laporanCount' => SipLaporan::count()],
            'perYear' => $perYear, 'coverage' => ['months' => $months, 'lastYear' => $now->year - 1, 'hasTahunanLastYear' => SipLaporan::where('type', 'tahunan')->where('period_year', $now->year - 1)->exists()],
            'summary' => ['newsDraft' => SipNews::where('status', 'draft')->count(), 'newsPinned' => SipNews::where('is_pinned', true)->where('status', 'published')->count(), 'programPinned' => SipProgramBantuan::where('is_pinned', true)->count(), 'laporanTahunan' => SipLaporan::where('type', 'tahunan')->count(), 'lastPenyaluranDate' => SipPenyaluranBantuan::orderByDesc('date')->first()?->date],
        ]]);
    }
}

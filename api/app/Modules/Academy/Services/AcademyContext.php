<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\ZakatAcademyLesson;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Models\ZakatAcademyQuiz;
use App\Modules\Academy\Models\ZakatAcademySetting;
use App\Modules\Core\Auth\SessionData;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademyContext
{
    public function admin(Request $request): void
    {
        $user = $request->user();
        $session = app(SessionData::class)->forUser($user);
        abort_unless($user->is_superadmin || ($session['moduleRoles']['academy'] ?? null) === 'admin', 403);
    }

    public function teacher(Request $request): void
    {
        $user = $request->user();
        $session = app(SessionData::class)->forUser($user);
        abort_unless($user->is_superadmin || in_array($session['moduleRoles']['academy'] ?? null, ['admin', 'teacher'], true), 403);
    }

    public function available(Request $request): void
    {
        if ($request->user()?->is_superadmin) {
            return;
        }
        abort_unless(DB::table('modules')->where('slug', 'academy')->where('is_active', true)->exists() && ZakatAcademySetting::where('key', 'maintenance_mode')->value('value') !== 'true', 403, 'Program sedang tidak tersedia.');
    }

    public function profile(Request $request): ZakatAcademyProfile
    {
        $this->available($request);
        $profile = ZakatAcademyProfile::where('user_id', $request->user()->id)->whereNull('deleted_at')->firstOrFail();
        abort_if($profile->mustChangePassword, 403, 'Ganti password awal sebelum melanjutkan.');

        return $profile;
    }

    public function released($startsAt, int $day): bool
    {
        if (! $startsAt || $startsAt->isFuture()) {
            return false;
        }

        return (int) $startsAt->setTimezone('Asia/Jakarta')->startOfDay()->diffInDays(CarbonImmutable::now('Asia/Jakarta')->startOfDay()) + 1 >= $day;
    }

    public function lesson(string $id, string $profileId)
    {
        $lesson = ZakatAcademyLesson::where('id', $id)->where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profileId))))->with('chapter.course')->firstOrFail();
        abort_unless($this->released($lesson->chapter->course->startsAt, $lesson->releaseDay), 403, 'Materi belum dibuka.');

        return $lesson;
    }

    public function quiz(string $id, string $profileId)
    {
        return ZakatAcademyQuiz::where('id', $id)->where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profileId))))->with(['chapter.course', 'questions' => fn ($q) => $q->orderBy('order')->orderBy('id'), 'questions.options'])->firstOrFail();
    }

    public function settings(): array
    {
        $values = ZakatAcademySetting::whereIn('key', ['cs_phone', 'daily_weight', 'weekly_weight', 'final_weight'])->pluck('value', 'key');

        return ['csPhone' => $values['cs_phone'] ?? '628111186626', 'weights' => ['DAILY' => (int) ($values['daily_weight'] ?? 20), 'WEEKLY' => (int) ($values['weekly_weight'] ?? 30), 'FINAL' => (int) ($values['final_weight'] ?? 50)]];
    }

    public function weighted(array $quizzes, array $attempts): array
    {
        $best = [];
        foreach ($attempts as $attempt) {
            $best[$attempt['quizId']] = max($best[$attempt['quizId']] ?? 0, (float) ($attempt['score'] ?? 0));
        }
        $means = [];
        $complete = true;
        foreach (['DAILY', 'WEEKLY', 'FINAL'] as $kind) {
            $group = array_filter($quizzes, fn ($q) => $q['kind'] === $kind);
            $means[$kind] = count($group) ? array_sum(array_map(fn ($q) => $best[$q['id']] ?? 0, $group)) / count($group) : 0;
            if (! count($group)) {
                $complete = false;
            }
        }
        foreach ($quizzes as $quiz) {
            if (! array_key_exists($quiz['id'], $best)) {
                $complete = false;
            }
        }
        $weights = $this->settings()['weights'];
        $score = 0;
        foreach ($means as $kind => $mean) {
            $score += $mean * $weights[$kind];
        }

        return ['best' => $best, 'means' => $means, 'score' => round($score) / 100, 'complete' => $complete];
    }

    public function safeUrl(?string $value): bool
    {
        if (! $value) {
            return true;
        }
        if (preg_match('/[\x00-\x1f\x7f\\\\]/', $value)) {
            return false;
        }
        if (str_starts_with($value, '/') && ! str_starts_with($value, '//')) {
            return true;
        }
        $url = parse_url($value);

        return $url && ($url['scheme'] ?? '') === 'https' && ! isset($url['user']) && ! isset($url['pass']) && ! empty($url['host']);
    }
}

<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademySetting as Setting;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Modules\Academy\Models\AcademyCohort as Cohort;
use Illuminate\Support\Str;

class IntakeController
{
    public function __construct(private AcademyContext $context) {}

    private function data($value = [])
    {
        return response()->json(['data' => ['error' => '', 'message' => 'Data berhasil disimpan.'] + $value]);
    }

    private function lockIntake(string $id)
    {
        $row = Course::where('id', $id)->lockForUpdate()->firstOrFail();
        abort_unless($row->isPublished && $row->registrationOpen && (! $row->startsAt || $row->startsAt->isFuture()), 409, 'Pendaftaran angkatan sudah ditutup.');

        return $row;
    }

    private function phone(string $value): ?string
    {
        $value = preg_replace('/[\s()+.\-]/', '', $value);
        if (str_starts_with($value, '0')) {
            $value = '62'.substr($value, 1);
        }

        return preg_match('/^62[1-9]\d{7,12}$/', $value) ? $value : null;
    }

    private function nip(): string
    {
        DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'academy', 'last_number' => 0]);
        $counter = DB::table('participant_sequences')->where('module_slug', 'academy')->lockForUpdate()->first();
        $number = $counter->last_number + 1;
        DB::table('participant_sequences')->where('module_slug', 'academy')->update(['last_number' => $number]);

        return 'PAZ'.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
    }

    public function import(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $input = $request->validate(['csv' => 'required|string|max:100000', 'cohortId' => 'required|string|exists:academy_cohorts,id']);
        $csv = $input['csv'];
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, preg_replace('/^\xEF\xBB\xBF/', '', $csv));
        rewind($stream);
        $headers = fgetcsv($stream, null, ',', '"', '');
        abort_unless($headers && ! array_diff(['name', 'email', 'phone', 'gender'], array_map('strtolower', array_map('trim', $headers))), 422, 'Kolom CSV wajib: name,email,phone,gender.');
        $headers = array_map('strtolower', array_map('trim', $headers));
        $rows = [];
        while (($line = fgetcsv($stream, null, ',', '"', '')) !== false) {
            if (! array_filter($line, fn ($v) => trim((string) $v) !== '')) {
                continue;
            }
            $values = [];
            foreach (['name', 'email', 'phone', 'gender'] as $key) {
                $values[$key] = trim($line[array_search($key, $headers, true)] ?? '');
            }
            $values['email'] = strtolower($values['email']);
            $values['phone'] = $this->phone($values['phone']);
            $values['gender'] = strtoupper($values['gender']);
            abort_unless(mb_strlen($values['name']) >= 2 && mb_strlen($values['name']) <= 100 && filter_var($values['email'], FILTER_VALIDATE_EMAIL) && strlen($values['email']) <= 191 && $values['phone'] && in_array($values['gender'], ['IKHWAN', 'AKHWAT'], true), 422, 'Data CSV tidak valid.');
            $rows[] = $values;
            abort_if(count($rows) > 50, 422, 'Impor maksimal 50 peserta per batch.');
        } fclose($stream);
        abort_if(! count($rows) || count(array_unique(array_column($rows, 'email'))) !== count($rows) || count(array_unique(array_column($rows, 'phone'))) !== count($rows), 422, 'Email atau nomor WhatsApp dalam CSV berulang.');
        $credentials = DB::transaction(function () use ($rows, $courseId, $input) {
            $cohort = Cohort::where('id', $input['cohortId'])->lockForUpdate()->firstOrFail();
            $course = Course::where('id', $courseId)->lockForUpdate()->firstOrFail();
            abort_if($course->cohortId && $course->cohortId !== $cohort->id, 422, 'Materi bukan milik angkatan tujuan.');
            $credentials = [];
            foreach ($rows as $data) {
                $user = User::where('email', $data['email'])->lockForUpdate()->first();
                abort_if($user && ! $user->is_active, 409, 'CSV memuat akun nonaktif.');
                $profile = $user ? Profile::where('user_id', $user->id)->lockForUpdate()->first() : null;
                abort_if($profile?->deletedAt || $profile && (($profile->phone && $profile->phone !== $data['phone']) || ($profile->gender && $profile->gender !== $data['gender'])), 409, 'Data peserta yang sudah ada tidak cocok.');

                if ($profile && Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->exists()) {
                    continue;
                }
                $this->lockIntake($courseId);
                $newUser = ! $user;
                if (! $user) {
                    $password = 'Ia!'.Str::random(16);
                    $user = new User;
                    $user->name = $data['name'];
                    $user->email = $data['email'];
                    $user->password_hash = Hash::make($password);
                    $user->save();
                    $credentials[] = ['email' => $user->email, 'password' => $password];
                }

                $profile ??= new Profile;
                $profile->cohortId = $cohort->id;
                $profile->userId = $user->id;
                $profile->nis = $profile->nis ?: $this->nip();
                $profile->phone = $data['phone'];
                $profile->gender = $data['gender'];
                if ($newUser) {
                    $profile->mustChangePassword = true;
                } $profile->save();
                app(\App\Modules\Academy\Services\CohortLearning::class)->join($profile, $cohort);
                if (Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->exists()) { continue; }
                $enrollment = new Enrollment;
                $enrollment->profileId = $profile->id;
                $enrollment->courseId = $courseId;
                $enrollment->save();
            }

            return $credentials;
        }, 3);

        return $this->data(['credentials' => $credentials]);
    }

    public function group(Request $request, string $id)
    {
        $this->context->admin($request);
        $data = $request->validate(['joined' => 'required|boolean']);
        $row = Enrollment::findOrFail($id);
        $row->groupJoinedAt = $data['joined'] ? now() : null;
        $row->save();

        return $this->data();
    }

    public function schedule(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $data = $request->validate(['startsAt' => 'nullable|date_format:Y-m-d\TH:i']);
        $date = empty($data['startsAt']) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $data['startsAt'], 'Asia/Jakarta')->utc();
        DB::transaction(function () use ($courseId, $date) {
            $row = Course::where('id', $courseId)->lockForUpdate()->firstOrFail();
            abort_if($row->startsAt && ! $row->startsAt->isFuture() && (! $date || ! $date->equalTo($row->startsAt)), 409, 'Tanggal program yang sudah dimulai tidak dapat digeser.');
            $row->startsAt = $date;
            $row->durationDays = 30;
            $row->teacher = 'Ustadz Irham';
            $row->save();
        }, 3);

        return $this->data();
    }

    public function settings(Request $request)
    {
        $this->context->admin($request);
        $data = $request->validate(['csPhone' => 'required|string', 'daily_weight' => 'required|integer|min:0|max:100', 'weekly_weight' => 'required|integer|min:0|max:100', 'final_weight' => 'required|integer|min:0|max:100']);
        $phone = $this->phone($data['csPhone']);
        abort_unless($phone && $data['daily_weight'] + $data['weekly_weight'] + $data['final_weight'] === 100, 422, 'Nomor CS harus valid dan bobot harus berjumlah 100%.');
        DB::transaction(function () use ($data, $phone) {
            foreach (['daily_weight', 'weekly_weight', 'final_weight', 'cs_phone'] as $key) {
                $row = Setting::where('key', $key)->first() ?? new Setting;
                $row->key = $key;
                $row->value = $key === 'cs_phone' ? $phone : (string) $data[$key];
                $row->save();
            }
        });

        return $this->data();
    }

    public function registration(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $data = $request->validate(['open' => 'required|boolean']);
        DB::transaction(function () use ($courseId, $data) {
            Course::where('is_simulation', false)->orderBy('id')->lockForUpdate()->get();
            $row = Course::where('id', $courseId)->where('is_simulation', false)->firstOrFail();
            abort_if($data['open'] && ($row->startsAt && ! $row->startsAt->isFuture()), 409, 'Pembelajaran sudah dimulai.');
            if ($data['open']) {
                Course::where('is_simulation', false)->update(['registration_open' => false]);
            } $row->registrationOpen = $data['open'];
            if ($data['open']) {
                $row->isPublished = true;
            } $row->save();
        }, 3);

        return $this->data();
    }

    public function cohort(Request $request)
    {
        $this->context->admin($request);
        $data = $request->validate(['title' => 'required|string|min:3|max:191|unique:academy_cohorts,title']);
        $cohort = new Cohort;
        $cohort->title = $data['title'];

        $cohort->registrationOpen = false;
        $cohort->save();

        return $this->data(['id' => $cohort->id]);
    }

    public function cohortRegistration(Request $request, string $id)
    {
        $this->context->admin($request);
        $data = $request->validate(['open' => 'required|boolean']);
        DB::transaction(function () use ($id, $data) {
            // Serialize concurrent switches to the public registration cohort.
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'academy', 'last_number' => 0]);
            DB::table('participant_sequences')->where('module_slug', 'academy')->lockForUpdate()->first();
            $cohort = Cohort::where('id', $id)->lockForUpdate()->firstOrFail();
            if ($data['open']) {
                Cohort::query()->update(['registration_open' => false]);
            }
            $cohort->registrationOpen = $data['open'];
            $cohort->save();
        }, 3);

        return $this->data();
    }

    public function contacts(Request $request)
    {
        $this->context->admin($request);
        $courseId = $request->validate(['courseId' => 'required|string'])['courseId'];
        $rows = Enrollment::where('course_id', $courseId)->with('profile.user')->get();
        $body = '';
        $escape = fn ($v) => str_replace(['\\', "\r", "\n", ',', ';'], ['\\\\', ' ', ' ', '\\,', '\\;'], $v);
        foreach ($rows as $row) {
            if ($row->profile->phone) {
                $body .= "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:".$escape($row->profile->user->name)."\r\nTEL;TYPE=CELL:+".$row->profile->phone."\r\nEMAIL:".$escape($row->profile->user->email)."\r\nEND:VCARD\r\n";
            }
        }

        return response($body, 200, ['Content-Type' => 'text/vcard; charset=utf-8', 'Content-Disposition' => 'attachment; filename="insan-academy-contacts.vcf"', 'Cache-Control' => 'private, no-store']);
    }
}

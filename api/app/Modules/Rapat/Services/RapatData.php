<?php

namespace App\Modules\Rapat\Services;

use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use Illuminate\Support\Facades\Validator;

class RapatData
{
    public const TEMPLATES = ['dinas' => 'Notulen Dinas', 'berita_acara' => 'Berita Acara', 'guru' => 'Rapat Guru', 'supervisi' => 'Supervisi', 'organisasi' => 'Organisasi'];

    public static function institution(): array
    {
        return ['name' => '', 'heading' => '', 'address' => ''];
    }

    public static function minutes(): array
    {
        return ['summary' => '', 'discussion' => [], 'decisions' => [], 'actions' => []];
    }

    public static function rules(bool $create = false): array
    {
        $r = ['title' => ['nullable', 'string', 'max:255'], 'meetingDate' => ['nullable', 'date_format:Y-m-d'], 'template' => ['in:'.implode(',', array_keys(self::TEMPLATES))],
            'startTime' => ['nullable', 'date_format:H:i'], 'endTime' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:1000'], 'agenda' => ['nullable', 'string', 'max:20000'], 'chair' => ['nullable', 'string', 'max:255'], 'notetaker' => ['nullable', 'string', 'max:255'],
            'participants' => ['array', 'max:500'], 'participants.*' => ['array:name,position,attendance'], 'participants.*.name' => ['sometimes', 'nullable', 'string', 'max:255'], 'participants.*.position' => ['sometimes', 'nullable', 'string', 'max:255'], 'participants.*.attendance' => ['sometimes', 'in:present,absent,excused'],
            'institution' => ['array:name,heading,address'], 'institution.name' => ['present', 'nullable', 'string', 'max:1000'], 'institution.heading' => ['present', 'nullable', 'string', 'max:2000'], 'institution.address' => ['present', 'nullable', 'string', 'max:2000'],
            'transcript' => ['nullable', 'string', 'max:200000'], 'minutes' => ['array:summary,discussion,decisions,actions'],
            'minutes.summary' => ['present', 'nullable', 'string', 'max:50000'], 'minutes.discussion' => ['present', 'array', 'max:500'], 'minutes.discussion.*' => ['string', 'max:10000'],
            'minutes.decisions' => ['present', 'array', 'max:500'], 'minutes.decisions.*' => ['string', 'max:10000'],
            'minutes.actions' => ['present', 'array', 'max:500'], 'minutes.actions.*' => ['array:task,assignee,dueDate,status'],
            'minutes.actions.*.task' => ['required', 'string', 'max:2000'], 'minutes.actions.*.assignee' => ['present', 'nullable', 'string', 'max:255'],
            'minutes.actions.*.dueDate' => ['present', 'nullable', 'date_format:Y-m-d'], 'minutes.actions.*.status' => ['required', 'in:open,done']];
        foreach ($r as $k => &$v) {
            if (! str_contains($k, '.')) {
                array_unshift($v, 'sometimes');
            }
        }
        unset($v);
        foreach ($r as $k => &$v) {
            if (str_contains($k, '.')) {
                array_unshift($v, 'exclude_without:'.explode('.', $k)[0]);
            }
        }

        return $r;
    }

    public static function normalize(array $data): array
    {
        if (isset($data['participants'])) {
            $data['participants'] = array_values(array_map(fn ($participant) => [...$participant, 'position' => $participant['position'] ?? '', 'attendance' => $participant['attendance'] ?? 'present'], array_filter($data['participants'], fn ($p) => trim($p['name'] ?? '') !== '')));
        }
        if (isset($data['institution'])) {
            foreach (['name', 'heading', 'address'] as $key) {
                $data['institution'][$key] = $data['institution'][$key] ?? '';
            }
        }
        if (array_key_exists('transcript', $data)) {
            $data['transcript'] = $data['transcript'] ?? '';
        }
        if (isset($data['minutes'])) {
            $data['minutes']['summary'] = $data['minutes']['summary'] ?? '';
        }

        return $data;
    }

    public static function transcribed(array $data): array
    {
        return Validator::make($data, ['text' => 'present|string|max:200000', 'segments' => 'present|array|max:20000', 'segments.*' => 'array:start,end,text,speaker', 'segments.*.start' => 'required|numeric|min:0', 'segments.*.end' => 'required|numeric|min:0', 'segments.*.text' => 'required|string|max:200000', 'segments.*.speaker' => 'present|nullable|string|max:255'])->validate();
    }

    public static function overdue(array $action): bool
    {
        return ($action['status'] ?? 'open') === 'open' && ! empty($action['dueDate']) && $action['dueDate'] < now('Asia/Jakarta')->toDateString();
    }

    public static function summary(Meeting $m): array
    {
        $p = self::normalize($m->payload);
        $actions = $p['minutes']['actions'] ?? [];

        return ['workflowStatus' => $p['workflowStatus'] ?? 'draft', 'finalizedAt' => $p['finalizedAt'] ?? null, 'createdAt' => $m->created_at->toIso8601String(), 'participantCount' => count($p['participants'] ?? []), 'decisionCount' => count($p['minutes']['decisions'] ?? []), 'doneActionCount' => count(array_filter($actions, fn ($a) => $a['status'] === 'done')), 'overdueActionCount' => count(array_filter($actions, fn ($a) => self::overdue($a))), 'id' => $m->id, 'title' => $p['title'], 'meetingDate' => $m->meeting_date->format('Y-m-d'), 'location' => $p['location'] ?? null, 'template' => $p['template'], 'status' => $m->status, 'archivedAt' => $m->archived_at?->toIso8601String(), 'createdBy' => $m->created_by, 'version' => $m->version, 'updatedAt' => $m->updated_at->toIso8601String(), 'mediaCount' => Media::where('meeting_id', $m->id)->count(), 'actionCount' => count($p['minutes']['actions'] ?? [])];
    }

    public static function media(Media $m): array
    {
        return ['id' => $m->id, 'name' => $m->payload['name'], 'mime' => $m->mime, 'size' => $m->size, 'sequence' => $m->sequence, 'transcribed' => $m->transcribed];
    }

    public static function detail(Meeting $m): array
    {
        $p = self::normalize($m->payload);
        $state = $p['transcriptionState'] ?? null;
        unset($p['transcriptionState']);
        $p['transcriptionProgress'] = $state ? [
            'phase' => $state['phase'], 'completedParts' => $state['parts'],
            'processedAudioSeconds' => $state['seconds'], 'chunkSeconds' => 900,
        ] : null;

        return [...$p, 'historyAvailable' => false, ...self::summary($m), 'media' => Media::where('meeting_id', $m->id)->orderBy('sequence')->orderBy('id')->get()->map(fn ($f) => self::media($f))->all()];
    }
}

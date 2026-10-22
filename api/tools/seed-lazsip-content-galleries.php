<?php

use App\Modules\Lazsip\Models\LazsipActivity;
use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipProgram;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! $app->environment('local') || config('database.default') !== 'mysql'
    || DB::connection()->getDatabaseName() !== 'sipmodular_laravel_dev') {
    fwrite(STDERR, "Only the local development MySQL database is permitted.\n");
    exit(1);
}
$models = ['campaign' => LazsipCampaign::class, 'kegiatan' => LazsipActivity::class, 'program' => LazsipProgram::class];
$assets = ['pendidikan', 'kesehatan', 'kebutuhan-pokok', 'gempa-ntt', 'anak-yatim', 'air-bersih'];
foreach ($models as $model) {
    if (! Schema::hasColumn((new $model)->getTable(), 'documentation_photos')) {
        fwrite(STDERR, "Run the gallery migrations first.\n");
        exit(1);
    }
}
foreach ($assets as $asset) {
    if (! is_file(dirname(base_path()).'/public/aid/'.$asset.'.jpg')) {
        fwrite(STDERR, "Missing local demo photo.\n");
        exit(1);
    }
}
if (! in_array('--apply', $argv, true)) {
    foreach ($models as $kind => $model) {
        echo $kind.': '.$model::count()." records; dry run only.\n";
    }
    exit(0);
}
try {
    $result = DB::transaction(function () use ($models, $assets): array {
        $snapshot = [];
        $records = [];
        foreach ($models as $kind => $model) {
            $records[$kind] = $model::query()->lockForUpdate()->get();
            $snapshot[$kind] = $records[$kind]->map(fn ($row) => ['id' => $row->id, 'documentationPhotos' => $row->documentationPhotos])->all();
        }
        $backup = storage_path('app/private/lazsip-galleries-before-demo-'.date('Ymd-His').'-'.bin2hex(random_bytes(3)).'.json');
        if (file_put_contents($backup, json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)) === false) {
            throw new RuntimeException('Backup failed.');
        }
        $stats = [];
        foreach ($records as $kind => $rows) {
            $updated = 0;
            foreach ($rows as $row) {
                $photos = $row->documentationPhotos ?? [];
                if (collect($photos)->contains(fn ($photo) => ! empty($photo['isDemo']))) {
                    continue; // Idempotent: never duplicate an existing demo set.
                }
                foreach ($assets as $index => $asset) {
                    $photos[] = ['id' => 'demo-'.bin2hex(random_bytes(8)), 'image' => '/aid/'.$asset.'.jpg',
                        'caption' => 'Contoh dokumentasi '.($index + 1).' — foto ilustrasi, bukan dokumentasi asli '.$kind.' ini.', 'isDemo' => true];
                }
                $row->documentationPhotos = $photos;
                $row->save();
                $updated++;
            }
            $stats[$kind] = ['records' => $rows->count(), 'updated' => $updated, 'photosAdded' => $updated * 6];
        }

        return ['results' => $stats, 'backup' => basename($backup)];
    });
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, "Seeding failed; gallery changes rolled back.\n");
    exit(1);
}

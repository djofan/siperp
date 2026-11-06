<?php

// Explicit local-only fixture setup. Never replaces real documentation or financial fields.
use App\Modules\Lazsip\Models\LazsipCampaign;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! $app->environment('local') || config('database.default') !== 'mysql'
    || DB::connection()->getDatabaseName() !== 'sipmodular_laravel_dev'
    || ! Schema::hasColumn('lazsip_campaigns', 'documentation_photos')) {
    fwrite(STDERR, "Local MySQL with the documentation migration is required.\n");
    exit(1);
}
$assets = ['pendidikan', 'kesehatan', 'kebutuhan-pokok', 'gempa-ntt', 'anak-yatim', 'air-bersih'];
foreach ($assets as $asset) {
    if (! is_file(dirname(base_path()).'/public/aid/'.$asset.'.jpg')) {
        fwrite(STDERR, "Missing local demo photo.\n");
        exit(1);
    }
}
if (! in_array('--apply', $argv, true)) {
    echo 'Dry run: '.LazsipCampaign::count()." campaigns; add six labeled demo photos where no demo gallery exists.\n";
    exit(0);
}
try {
    $result = DB::transaction(function () use ($assets): array {
        $campaigns = LazsipCampaign::query()->lockForUpdate()->get();
        $backup = storage_path('app/private/campaign-gallery-before-demo-'.date('Ymd-His').'.json');
        $snapshot = $campaigns->map(fn ($row) => ['id' => $row->id, 'documentationPhotos' => $row->documentationPhotos])->all();
        if (file_put_contents($backup, json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)) === false) {
            throw new RuntimeException('Could not save documentation backup.');
        }
        $updated = 0;
        foreach ($campaigns as $campaign) {
            $photos = $campaign->documentationPhotos ?? [];
            if (collect($photos)->contains(fn ($photo) => ! empty($photo['isDemo']))) {
                continue;
            }
            foreach ($assets as $index => $asset) {
                $photos[] = ['id' => 'demo-'.bin2hex(random_bytes(8)), 'image' => '/aid/'.$asset.'.jpg',
                    'caption' => 'Contoh dokumentasi '.($index + 1).' — ilustrasi kegiatan bantuan, bukan bukti penyaluran campaign ini.', 'isDemo' => true];
            }
            $campaign->documentationPhotos = $photos;
            $campaign->save();
            $updated++;
        }

        return ['totalCampaigns' => $campaigns->count(), 'updatedCampaigns' => $updated, 'demoPhotosAdded' => $updated * 6, 'backup' => basename($backup)];
    });
    echo json_encode($result, JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, "Demo gallery setup failed; transaction rolled back.\n");
    exit(1);
}

<?php

namespace App\Modules\Keuangan\Console;

use App\Modules\Keuangan\Services\LegacyFinanceImport;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Throwable;

class ImportLegacyFinance extends Command
{
    protected $signature = 'keuangan:import-legacy {snapshot} {mapping} {--apply : Write only to an isolated local SQLite copy} {--review= : Review hash from the latest dry-run}';

    protected $description = 'Dry-run/import a private legacy finance snapshot on isolated local SQLite only';

    public function handle(LegacyFinanceImport $import): int
    {
        try {
            $import->guard();
            $read = function (string $path): array {
                if (! is_file($path) || filesize($path) > 50 * 1024 * 1024) {
                    throw new \RuntimeException('Berkas privat tidak tersedia/terlalu besar.');
                }
                $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($data)) {
                    throw new \RuntimeException('Format JSON tidak valid.');
                }

                return $data;
            };
            $result = $import->run($read($this->argument('snapshot')), $read($this->argument('mapping')), (bool) $this->option('apply'), $this->option('review'));
            $this->line(json_encode($result, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));

            return count($result['conflicts']) ? self::FAILURE : self::SUCCESS;
        } catch (Throwable $error) {
            // Never log SQL bindings, source rows, passwords or private financial text.
            $this->error($error instanceof \RuntimeException && ! $error instanceof QueryException ? $error->getMessage() : 'Validasi/impor gagal. Database tujuan tetap atomik; periksa format dan relasi melalui audit privat.');

            return self::FAILURE;
        }
    }
}

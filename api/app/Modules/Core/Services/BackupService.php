<?php

namespace App\Modules\Core\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PDO;
use RuntimeException;

class BackupService
{
    public function validId(string $id): bool
    {
        return (bool) preg_match('/^erp-\d{8}T\d{9}Z-[a-f0-9]{8}\.sipbak$/D', $id);
    }

    public function path(string $id): string
    {
        if (! $this->validId($id)) {
            throw new RuntimeException('ID backup tidak valid.');
        }

        return rtrim(config('backup.directory'), '/\\').DIRECTORY_SEPARATOR.$id;
    }

    private function directory(): string
    {
        $root = rtrim(config('backup.directory'), '/\\');
        if (! is_dir($root) && ! mkdir($root, 0700, true)) {
            throw new RuntimeException('Folder backup tidak tersedia.');
        }

        return $root;
    }

    private function key(bool $create = false): string
    {
        $key = config('backup.key');
        if (! $key) {
            $path = $this->directory().DIRECTORY_SEPARATOR.'backup-key.local';
            if ($create && ! file_exists($path)) {
                $handle = @fopen($path, 'x');
                if ($handle) {
                    fwrite($handle, bin2hex(random_bytes(32)));
                    fclose($handle);
                    chmod($path, 0600);
                }
            } $key = is_file($path) ? trim(file_get_contents($path)) : '';
        }
        if (! preg_match('/^[a-f0-9]{64}$/iD', $key)) {
            throw new RuntimeException('ERP_BACKUP_KEY harus 64 karakter hex.');
        }

        return hex2bin($key);
    }

    private function limit(int $size): void
    {
        if ($size > config('backup.max_bytes')) {
            throw new RuntimeException('Backup melebihi batas 256 MB.');
        }
    }

    private function quote(string $name): string
    {
        if (! preg_match('/^[A-Za-z0-9_]+$/D', $name)) {
            throw new RuntimeException('Nama tabel/kolom tidak valid.');
        }

        return '`'.$name.'`';
    }

    private function capture(string $root, string $label, array &$files, int &$budget): void
    {
        if (! is_dir($root)) {
            return;
        } $root = realpath($root);
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) {
            if ($file->isLink()) {
                throw new RuntimeException('Symlink upload tidak didukung.');
            } if (! $file->isFile()) {
                continue;
            }
            $before = stat($file->getPathname());
            $budget += $before['size'];
            $this->limit($budget);
            $bytes = file_get_contents($file->getPathname());
            clearstatcache(true, $file->getPathname());
            $after = stat($file->getPathname());
            if ($before['size'] !== $after['size'] || $before['mtime'] !== $after['mtime']) {
                throw new RuntimeException('File berubah saat backup.');
            }
            $files[] = ['root' => $label, 'path' => str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1)), 'sha256' => hash('sha256', $bytes), 'size' => strlen($bytes), 'data' => base64_encode($bytes)];
        }
    }

    public function create(): array
    {
        $lockPath = $this->directory().DIRECTORY_SEPARATOR.'create.lock';
        $lock = @fopen($lockPath, 'x');
        if (! $lock) {
            throw new RuntimeException('Backup lain sedang berjalan.');
        }
        $pdo = DB::connection()->getPdo();
        $transaction = false;
        try {
            if (DB::getDriverName() !== 'mysql') {
                throw new RuntimeException('Snapshot produksi memerlukan MySQL InnoDB.');
            }
            $tables = DB::select("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
            foreach ($tables as $table) {
                if ($table->engine !== 'InnoDB') {
                    throw new RuntimeException('Seluruh tabel harus InnoDB.');
                }
            }
            $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
            $transaction = true;
            $snapshot = ['version' => 1, 'createdAt' => CarbonImmutable::now()->toISOString(), 'tables' => [], 'files' => []];
            $size = 0;
            foreach ($tables as $table) {
                $name = $this->quote($table->name);
                $ddl = $pdo->query('SHOW CREATE TABLE '.$name)->fetch(PDO::FETCH_ASSOC)['Create Table'];
                $columns = $pdo->query('SHOW COLUMNS FROM '.$name)->fetchAll(PDO::FETCH_COLUMN);
                $rows = [];
                $query = $pdo->query('SELECT * FROM '.$name);
                while ($row = $query->fetch(PDO::FETCH_NUM)) {
                    $encoded = array_map(fn ($v) => is_string($v) && ! mb_check_encoding($v, 'UTF-8') ? ['type' => 'buffer', 'value' => base64_encode($v)] : $v, $row);
                    $size += strlen(json_encode($encoded, JSON_THROW_ON_ERROR));
                    $this->limit($size);
                    $rows[] = $encoded;
                }
                $snapshot['tables'][] = ['name' => $table->name, 'ddl' => $ddl, 'columns' => $columns, 'rows' => $rows];
            }
            $this->capture(Storage::disk('local')->path('academy'), 'academy', $snapshot['files'], $size);
            $this->capture(Storage::disk('local')->path('tanwir'), 'tanwir', $snapshot['files'], $size);
            $this->capture(Storage::disk('local')->path('ojol'), 'ojol', $snapshot['files'], $size);
            $this->capture(Storage::disk('public')->path('uploads'), 'public', $snapshot['files'], $size);
            $pdo->commit();
            $transaction = false;

            return $this->write($snapshot);
        } finally {
            if ($transaction && $pdo->inTransaction()) {
                $pdo->rollBack();
            } fclose($lock);
            unlink($lockPath);
        }
    }

    // Shared by the isolated backup integrity tests; does not touch a database.
    public function write(array $snapshot): array
    {
        $raw = json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $this->limit(strlen($raw));
        $iv = random_bytes(12);
        $encrypted = openssl_encrypt(gzencode($raw), 'aes-256-gcm', $this->key(true), OPENSSL_RAW_DATA, $iv, $tag);
        if ($encrypted === false) {
            throw new RuntimeException('Enkripsi gagal.');
        }
        $output = 'SIPBAK01'.$iv.$tag.$encrypted;
        $this->limit(strlen($output));
        $id = 'erp-'.CarbonImmutable::parse($snapshot['createdAt'])->format('Ymd\THisv\Z').'-'.bin2hex(random_bytes(4)).'.sipbak';
        $handle = fopen($this->path($id), 'x');
        if (! $handle) {
            throw new RuntimeException('File backup gagal dibuat.');
        } try {
            fwrite($handle, $output);
        } finally {
            fclose($handle);
        } chmod($this->path($id), 0600);

        return $this->summary($id, $snapshot) + ['size' => strlen($output)];
    }

    public function read(string $id): array
    {
        $path = $this->path($id);
        if (is_link($path) || ! is_file($path)) {
            throw new RuntimeException('Backup tidak ditemukan.');
        } $this->limit(filesize($path));
        $bytes = file_get_contents($path);
        if (strlen($bytes) < 36 || substr($bytes, 0, 8) !== 'SIPBAK01') {
            throw new RuntimeException('Format backup tidak valid.');
        }
        $compressed = openssl_decrypt(substr($bytes, 36), 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA, substr($bytes, 8, 12), substr($bytes, 20, 16));
        if ($compressed === false) {
            throw new RuntimeException('Integritas enkripsi gagal atau kunci tidak cocok.');
        }
        $raw = gzdecode($compressed, config('backup.max_bytes'));
        if ($raw === false) {
            throw new RuntimeException('Snapshot tidak valid.');
        } $this->limit(strlen($raw));
        $snapshot = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (($snapshot['version'] ?? null) !== 1 || ! is_array($snapshot['tables'] ?? null) || ! is_array($snapshot['files'] ?? null)) {
            throw new RuntimeException('Snapshot tidak valid.');
        }
        foreach ($snapshot['files'] as $file) {
            if (! in_array($file['root'], ['academy', 'public', 'tanwir', 'ojol'], true) || ! preg_match('#^[^/\\\\:]+(?:/[^/\\\\:]+)*$#D', $file['path']) || array_intersect(explode('/', $file['path']), ['.', '..'])) {
                throw new RuntimeException('Path file backup tidak valid.');
            }
            $data = base64_decode($file['data'], true);
            if ($data === false || strlen($data) !== $file['size'] || ! hash_equals($file['sha256'], hash('sha256', $data))) {
                throw new RuntimeException('Checksum file tidak cocok.');
            }
        }
        foreach ($snapshot['tables'] as $table) {
            $this->quote($table['name']);
            foreach ($table['columns'] as $column) {
                $this->quote($column);
            } foreach ($table['rows'] as $row) {
                if (! is_array($row) || count($row) !== count($table['columns'])) {
                    throw new RuntimeException('Baris backup tidak valid.');
                }
            }
        }

        return $snapshot;
    }

    private function summary(string $id, array $snapshot): array
    {
        return ['id' => $id, 'createdAt' => $snapshot['createdAt'], 'tables' => count($snapshot['tables']), 'rows' => array_sum(array_map(fn ($t) => count($t['rows']), $snapshot['tables'])), 'files' => count($snapshot['files'])];
    }

    public function verify(string $id): array
    {
        return $this->summary($id, $this->read($id));
    }

    public function list(): array
    {
        $rows = [];
        foreach (glob($this->directory().DIRECTORY_SEPARATOR.'*.sipbak') ?: [] as $file) {
            if ($this->validId(basename($file)) && ! is_link($file)) {
                $rows[] = ['id' => basename($file), 'size' => filesize($file), 'createdAt' => CarbonImmutable::createFromTimestampUTC(filemtime($file))->toISOString()];
            }
        } usort($rows, fn ($a, $b) => strcmp($b['id'], $a['id']));

        return $rows;
    }

    public function restore(string $id, string $targetUrl, string $filesDirectory): array
    {
        $url = parse_url($targetUrl);
        if (! $url || ! in_array($url['scheme'] ?? '', ['mysql', 'mariadb'], true) || empty($url['host']) || empty($url['path'])) {
            throw new RuntimeException('Target harus URL database MySQL.');
        }
        $database = ltrim($url['path'], '/');
        $this->quote($database);
        $host = $url['host'];
        $port = $url['port'] ?? 3306;
        $localHost = fn ($h) => in_array(strtolower($h), ['localhost', '127.0.0.1', '::1', '[::1]'], true) ? 'local' : strtolower($h);
        $source = config('database.connections.mysql');
        if ($database === $source['database'] && $port === (int) $source['port'] && $localHost($host) === $localHost($source['host'])) {
            throw new RuntimeException('Pemulihan ke database aktif ditolak.');
        }
        if (is_link($filesDirectory) || is_dir($filesDirectory) && count(array_diff(scandir($filesDirectory), ['.', '..']))) {
            throw new RuntimeException('Folder pemulihan harus kosong.');
        }
        $snapshot = $this->read($id);
        $pdo = new PDO('mysql:host='.$host.';port='.$port.';dbname='.$database.';charset=utf8mb4', rawurldecode($url['user'] ?? ''), rawurldecode($url['pass'] ?? ''), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        if ((int) $pdo->query('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchColumn()) {
            throw new RuntimeException('Database target harus kosong.');
        }
        if (! is_dir($filesDirectory) && ! mkdir($filesDirectory, 0700, true)) {
            throw new RuntimeException('Folder target tidak tersedia.');
        }
        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
            foreach ($snapshot['tables'] as $table) {
                if (! preg_match('/^CREATE TABLE\s+`?'.preg_quote($table['name'], '/').'`?\s*\(/i', $table['ddl'])) {
                    throw new RuntimeException('DDL backup tidak valid.');
                } $pdo->exec($table['ddl']);
            }
            $pdo->beginTransaction();
            foreach ($snapshot['tables'] as $table) {
                $columns = implode(',', array_map($this->quote(...), $table['columns']));
                $statement = $pdo->prepare('INSERT INTO '.$this->quote($table['name']).' ('.$columns.') VALUES ('.implode(',', array_fill(0, count($table['columns']), '?')).')');
                foreach ($table['rows'] as $row) {
                    $decoded = array_map(fn ($v) => is_array($v) ? match ($v['type'] ?? '') {
                        'buffer' => base64_decode($v['value'], true), 'bigint' => $v['value'], 'date' => CarbonImmutable::parse($v['value'])->utc()->format('Y-m-d H:i:s.v'), default => throw new RuntimeException('Tipe backup tidak valid.')
                    } : $v, $row);
                    $statement->execute($decoded);
                }
            }
            $pdo->commit();
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
            foreach ($snapshot['tables'] as $table) {
                if ((int) $pdo->query('SELECT COUNT(*) FROM '.$this->quote($table['name']))->fetchColumn() !== count($table['rows'])) {
                    throw new RuntimeException('Jumlah baris berbeda setelah pemulihan.');
                }
            }
            foreach ($snapshot['files'] as $file) {
                $full = rtrim($filesDirectory, '/\\').DIRECTORY_SEPARATOR.$file['root'].DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $file['path']);
                if (! is_dir(dirname($full))) {
                    mkdir(dirname($full), 0700, true);
                } $handle = fopen($full, 'x');
                if (! $handle) {
                    throw new RuntimeException('File pemulihan sudah ada.');
                } fwrite($handle, base64_decode($file['data'], true));
                fclose($handle);
                chmod($full, 0600);
            }

            return ['tables' => count($snapshot['tables']), 'files' => count($snapshot['files'])];
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            } throw new RuntimeException('Pemulihan gagal; target mungkin berisi tabel parsial. Database sumber tidak diubah.', 0, $error);
        }
    }
}

<?php

namespace App\Modules\Bantuan\Console;

use App\Modules\Bantuan\Services\Whatsapp;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class WhatsappOutbox extends Command
{
    protected $signature = 'bantuan:whatsapp {--limit=20 : Maximum messages per run (1–100)} {--status : Show counts without sending}';

    protected $description = 'Process the durable Bantuan WhatsApp outbox outside web requests';

    public function handle(Whatsapp $whatsapp): int
    {
        if ($this->option('status')) {
            $this->line('Configured: '.($whatsapp->configured() ? 'yes' : 'no'));
            $this->table(['Status', 'Count'], DB::table('bantuan_whatsapp_outbox')->selectRaw('status, COUNT(*) as total')->groupBy('status')->get()->map(fn ($row) => [$row->status, $row->total])->all());
            return self::SUCCESS;
        }
        $this->info($whatsapp->process((int) $this->option('limit')).' pesan diterima Fonnte.');
        return self::SUCCESS;
    }
}

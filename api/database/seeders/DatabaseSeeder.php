<?php

namespace Database\Seeders;

use App\Modules\Core\Models\Module;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'sip' => 'SIP',
            'sarsip' => 'SARSIP',
            'lazsip' => 'LAZSIP',
            'academy' => 'Insan Academy',
            'tanwir' => 'Tanwir Qurani',
            'ojol' => 'Ojol Mengaji',
            'teknisi' => 'Teknisi HP',
        ] as $slug => $name) {
            Module::query()->firstOrCreate(['slug' => $slug], ['name' => $name, 'isActive' => true]);
        }
    }
}

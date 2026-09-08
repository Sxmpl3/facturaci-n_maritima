<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Solo semilla un usuario operador demo. Los expedientes se crean desde la UI.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'operador@wixia.es'],
            [
                'name'     => 'Elena Álvarez',
                'password' => Hash::make('wixia2026'),
            ],
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ATLAS_ADMIN_EMAIL', 'admin@leonida-atlas.test');
        $password = env('ATLAS_ADMIN_PASSWORD');
        $generated = false;
        if (! $password) {
            $password = Str::password(20);
            $generated = true;
        }

        $admin = User::firstOrNew(['email' => $email]);
        if (! $admin->exists || $generated === false) {
            $admin->fill(['name' => 'Atlas Super Admin', 'password' => $password]);
        }
        $admin->role = 'super_admin';
        $admin->email_verified_at ??= now();
        $admin->save();

        if ($generated && $admin->wasRecentlyCreated) {
            $this->command?->warn("Super admin created: $email / $password (set ATLAS_ADMIN_PASSWORD to choose your own).");
        }

        // Demo staff accounts for exercising permissions locally; never created in production.
        if (app()->environment('local', 'testing')) {
            $demoPassword = env('ATLAS_DEMO_PASSWORD');
            if (! $demoPassword) {
                return;
            }
            foreach ([
                ['editor', 'Demo Editor', null],
                ['translator', 'Demo Translator', ['tr', 'es']],
                ['contributor', 'Demo Contributor', null],
            ] as [$role, $name, $locales]) {
                $u = User::firstOrNew(['email' => "$role@leonida-atlas.test"]);
                $u->fill(['name' => $name, 'password' => $demoPassword]);
                $u->role = $role;
                $u->translator_locales = $locales;
                $u->email_verified_at ??= now();
                $u->save();
            }
        }
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            // Horizontal focal point (0–100) used when a wide image is cropped into a tall card.
            $table->unsignedTinyInteger('focal_x')->nullable()->after('height');
        });
    }

    public function down(): void
    {
        Schema::table('media', fn (Blueprint $table) => $table->dropColumn('focal_x'));
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32)->index();
            $table->string('key', 64);
            $table->json('names');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['type', 'key']);
        });

        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 16)->default('image'); // image | embed | art
            $table->string('disk', 32)->nullable();
            $table->string('path')->nullable();
            $table->string('thumb_path')->nullable();
            $table->string('mime', 64)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('hash', 64)->nullable()->index();
            $table->string('embed_provider', 32)->nullable();
            $table->string('embed_id', 64)->nullable();
            $table->string('art_preset', 64)->nullable();
            $table->string('title')->nullable();
            $table->string('source_url', 2048)->nullable();
            $table->string('attribution')->nullable();
            $table->string('license')->nullable();
            $table->string('usage_status', 32)->default('original');
            $table->json('alt')->nullable();
            $table->json('caption')->nullable();
            $table->json('tags')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('entries', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32);
            $table->string('key', 128)->unique();
            $table->string('status', 16)->default('draft');
            $table->string('verification', 32)->default('unverified');
            $table->string('confidence', 16)->default('medium');
            $table->string('spoiler_level', 16)->default('none');
            $table->boolean('featured')->default(false);
            $table->integer('sort_order')->default(0);
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('region_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->foreignId('hero_media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->string('art_preset', 64)->nullable();
            $table->date('event_date')->nullable();
            $table->json('attributes')->nullable();
            $table->text('research_notes')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('last_verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['status', 'featured']);
            $table->index('verification');
        });

        Schema::create('entry_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('entry_type', 32);
            $table->string('locale', 8);
            $table->string('title');
            $table->string('slug', 191);
            $table->text('summary')->nullable();
            $table->longText('body')->nullable();
            $table->json('fields')->nullable();
            $table->json('aliases')->nullable();
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 320)->nullable();
            $table->text('search_text')->nullable();
            $table->string('status', 16)->default('draft');
            $table->boolean('is_machine')->default(false);
            $table->foreignId('translator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['entry_id', 'locale']);
            $table->unique(['entry_type', 'locale', 'slug']);
            $table->index(['locale', 'status']);
            $table->index('title');
        });

        Schema::create('character_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('full_name')->nullable();
            $table->string('role', 32)->default('supporting'); // protagonist | supporting | minor
            $table->string('affiliation')->nullable();
            $table->string('voice_actor')->nullable();
            $table->string('voice_actor_verification', 32)->nullable();
            $table->string('first_seen')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicle_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->string('vehicle_class', 32)->index(); // car, muscle, sports, suv, truck, motorcycle, boat, aircraft, emergency, offroad
            $table->string('body_style', 32)->nullable();
            $table->string('real_world_inspiration')->nullable();
            $table->string('inspiration_verification', 32)->nullable();
            // Performance stats are 0-100; null means unknown. Never invent them.
            $table->unsignedTinyInteger('top_speed')->nullable();
            $table->unsignedTinyInteger('acceleration')->nullable();
            $table->unsignedTinyInteger('braking')->nullable();
            $table->unsignedTinyInteger('handling')->nullable();
            $table->unsignedTinyInteger('durability')->nullable();
            $table->unsignedTinyInteger('seats')->nullable();
            $table->string('drivetrain', 16)->nullable();
            $table->string('stats_verification', 32)->nullable();
            $table->string('first_seen')->nullable();
            $table->timestamps();
        });

        Schema::create('weapon_specs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('weapon_class', 32)->index();
            $table->unsignedTinyInteger('damage')->nullable();
            $table->unsignedTinyInteger('fire_rate')->nullable();
            $table->unsignedTinyInteger('range')->nullable();
            $table->unsignedTinyInteger('accuracy')->nullable();
            $table->unsignedSmallInteger('magazine')->nullable();
            $table->string('stats_verification', 32)->nullable();
            $table->string('first_seen')->nullable();
            $table->timestamps();
        });

        Schema::create('mission_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('mission_type', 32)->default('main'); // main | side | story_arc | activity
            $table->unsignedInteger('sequence')->nullable();
            $table->foreignId('giver_id')->nullable()->constrained('entries')->nullOnDelete();
            $table->boolean('missable')->default(false);
            $table->unsignedInteger('reward_cash')->nullable();
            $table->timestamps();
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->json('names');
            $table->timestamps();
        });

        Schema::create('entry_tag', function (Blueprint $table) {
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['entry_id', 'tag_id']);
        });

        Schema::create('entry_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('media_id')->constrained('media')->restrictOnDelete();
            $table->string('role', 16)->default('gallery'); // hero | gallery | evidence | video
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['entry_id', 'media_id', 'role']);
        });

        Schema::create('entry_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_entry_id')->constrained('entries')->cascadeOnDelete();
            $table->foreignId('to_entry_id')->constrained('entries')->cascadeOnDelete();
            $table->string('relation_type', 32)->default('related');
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['from_entry_id', 'to_entry_id', 'relation_type']);
            $table->index('to_entry_id');
        });

        Schema::create('sources', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('url', 2048);
            $table->string('url_hash', 64)->unique();
            $table->string('publisher')->nullable();
            $table->string('author')->nullable();
            $table->string('source_type', 32)->default('press'); // official | press | community | wiki | video
            $table->date('published_on')->nullable();
            $table->date('accessed_on')->nullable();
            $table->timestamps();
        });

        Schema::create('entry_source', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_id')->constrained()->cascadeOnDelete();
            $table->text('evidence_note')->nullable();
            $table->string('supports', 32)->default('primary'); // primary | context | disputes
            $table->timestamps();
            $table->unique(['entry_id', 'source_id']);
        });

        Schema::create('verification_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            $table->text('note')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('entry_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 8)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('summary')->nullable();
            $table->json('snapshot');
            $table->timestamps();
        });

        Schema::create('map_markers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained()->cascadeOnDelete();
            $table->string('category', 32)->index();
            // Normalized image-relative coordinates (0..1), independent of rendered size.
            $table->decimal('x', 8, 6);
            $table->decimal('y', 8, 6);
            $table->string('precision', 16)->default('approximate'); // confirmed | approximate
            $table->text('approximation_basis')->nullable();
            $table->unsignedTinyInteger('zoom')->default(2);
            $table->string('status', 16)->default('draft');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['map_markers', 'entry_revisions', 'verification_events', 'entry_source', 'sources', 'entry_relations', 'entry_media', 'entry_tag', 'tags', 'mission_details', 'weapon_specs', 'vehicle_specs', 'character_profiles', 'entry_translations', 'entries', 'media', 'categories'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};

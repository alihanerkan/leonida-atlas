<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Entry;
use App\Models\EntryRelation;
use App\Models\EntryTranslation;
use App\Models\Media;
use App\Models\Submission;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\SeedsAtlas;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase, SeedsAtlas;

    private function payload(array $overrides = []): array
    {
        return array_replace_recursive([
            'type' => 'location',
            'key' => 'test-landmark',
            'status' => 'published',
            'verification' => 'reported',
            'confidence' => 'medium',
            'spoiler_level' => 'none',
            'featured' => false,
            'tags' => [],
            'specs' => [],
            'source' => ['title' => 'Test Landmark', 'summary' => 'A test landmark.', 'body' => 'Body text.', 'fields' => ['highlights' => ['One']]],
        ], $overrides);
    }

    public function test_admin_area_requires_staff_role()
    {
        $this->get('/admin')->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs(User::factory()->create())->postJson('/admin/entries', $this->payload())->assertForbidden();
        $this->actingAs(User::factory()->role('editor')->create())->get('/admin')->assertOk();
    }

    public function test_deactivated_staff_lose_access_and_cannot_log_in()
    {
        $user = User::factory()->role('admin')->create(['is_active' => false]);
        $this->actingAs($user)->get('/admin')->assertForbidden();
        auth()->logout();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
    }

    public function test_editor_can_create_update_and_publish_entries_with_history()
    {
        $editor = User::factory()->role('editor')->create();
        $this->actingAs($editor)->post('/admin/entries', $this->payload())->assertRedirect();
        $entry = Entry::where('key', 'test-landmark')->firstOrFail();

        $this->get('/en/locations/test-landmark')->assertOk();
        $this->assertSame(1, $entry->revisions()->count());
        $this->assertSame(1, $entry->verificationEvents()->count());

        $this->actingAs($editor)->put("/admin/entries/{$entry->id}", $this->payload(['verification' => 'official', 'verification_note' => 'Confirmed on Newswire']))->assertSessionHasNoErrors();
        $this->assertSame('official', $entry->fresh()->verification);
        $this->assertDatabaseHas('verification_events', ['entry_id' => $entry->id, 'from_status' => 'reported', 'to_status' => 'official', 'note' => 'Confirmed on Newswire']);
        $this->assertTrue(AuditEvent::where('action', 'entry.updated')->where('subject_id', $entry->id)->exists());

        $this->actingAs($editor)->put("/admin/entries/{$entry->id}", $this->payload(['status' => 'draft']))->assertSessionHasNoErrors();
        $this->get('/en/locations/test-landmark')->assertNotFound();
    }

    public function test_entry_validation_and_type_specific_rules()
    {
        $editor = User::factory()->role('editor')->create();
        $this->actingAs($editor)->post('/admin/entries', $this->payload(['key' => 'Bad Key!', 'source' => ['title' => '']]))->assertSessionHasErrors(['key', 'source.title']);
        $this->actingAs($editor)->post('/admin/entries', $this->payload(['type' => 'vehicle', 'key' => 'fast-car', 'specs' => ['vehicle_class' => 'spaceship', 'top_speed' => 150]]))
            ->assertSessionHasErrors(['specs.vehicle_class', 'specs.top_speed']);
        $this->actingAs($editor)->post('/admin/entries', $this->payload(['type' => 'vehicle', 'key' => 'fast-car', 'specs' => ['vehicle_class' => 'sports', 'manufacturer' => 'Grotti']]))->assertSessionHasNoErrors();
        $this->assertDatabaseHas('vehicle_specs', ['manufacturer' => 'Grotti', 'top_speed' => null]);
    }

    public function test_contributors_can_draft_but_never_publish()
    {
        $contributor = User::factory()->role('contributor')->create();
        $this->actingAs($contributor)->post('/admin/entries', $this->payload(['featured' => true]))->assertRedirect();
        $entry = Entry::where('key', 'test-landmark')->firstOrFail();
        $this->assertSame('review', $entry->status);
        $this->assertFalse($entry->featured);

        $this->actingAs($contributor)->put("/admin/entries/{$entry->id}", $this->payload())->assertForbidden();
        $this->actingAs($contributor)->post('/admin/entries/bulk', ['ids' => [$entry->id], 'action' => 'publish'])->assertForbidden();
        $this->get('/en/locations/test-landmark')->assertNotFound();
    }

    public function test_soft_delete_restore_and_bulk_actions()
    {
        $editor = User::factory()->role('editor')->create();
        $a = $this->makeEntry('alpha');
        $b = $this->makeEntry('beta', 'location', ['status' => 'draft']);

        $this->actingAs($editor)->delete("/admin/entries/{$a->id}")->assertRedirect('/admin/entries');
        $this->assertSoftDeleted($a);
        $this->get('/en/locations/alpha')->assertNotFound();
        $this->actingAs($editor)->post("/admin/entries/{$a->id}/restore")->assertRedirect();
        $this->get('/en/locations/alpha')->assertOk();

        $this->actingAs($editor)->post('/admin/entries/bulk', ['ids' => [$b->id], 'action' => 'publish'])->assertRedirect();
        $this->get('/en/locations/beta')->assertOk();
    }

    public function test_translators_are_limited_to_assigned_languages_and_cannot_publish()
    {
        $entry = $this->makeEntry('gamma');
        $translator = User::factory()->role('translator', ['tr'])->create();

        $this->actingAs($translator)->get("/admin/translations/{$entry->id}/fr")->assertForbidden();
        $this->actingAs($translator)->post("/admin/translations/{$entry->id}/tr/copy")->assertRedirect();
        $this->assertDatabaseHas('entry_translations', ['entry_id' => $entry->id, 'locale' => 'tr', 'status' => 'draft']);

        $data = ['title' => 'Gama', 'slug' => 'gama', 'summary' => 'Özet', 'body' => 'Metin', 'status' => 'published'];
        $this->actingAs($translator)->put("/admin/translations/{$entry->id}/tr", $data)->assertForbidden();
        $this->actingAs($translator)->put("/admin/translations/{$entry->id}/tr", [...$data, 'status' => 'review'])->assertSessionHasNoErrors();
        $this->get('/tr/konumlar/gama')->assertNotFound();

        $this->actingAs($translator)->post('/admin/entries', $this->payload())->assertForbidden();
        $this->actingAs($translator)->get('/admin/settings')->assertForbidden();

        $editor = User::factory()->role('editor')->create();
        $this->actingAs($editor)->put("/admin/translations/{$entry->id}/tr", [...$data, 'mark_reviewed' => true])->assertSessionHasNoErrors();
        $this->get('/tr/konumlar/gama')->assertOk();
        $this->assertNotNull(EntryTranslation::where('entry_id', $entry->id)->where('locale', 'tr')->value('reviewed_at'));
    }

    public function test_relations_are_deduplicated_and_removable()
    {
        $editor = User::factory()->role('editor')->create();
        $a = $this->makeEntry('one');
        $b = $this->makeEntry('two');

        $this->actingAs($editor)->post("/admin/entries/{$a->id}/relations", ['to_entry_id' => $b->id, 'relation_type' => 'related'])->assertSessionHas('success');
        $this->actingAs($editor)->post("/admin/entries/{$b->id}/relations", ['to_entry_id' => $a->id, 'relation_type' => 'related'])->assertSessionHas('error');
        $this->assertSame(1, EntryRelation::count());

        $this->get('/en/locations/two')->assertInertia(fn ($p) => $p->where('entry.related.locations.0.key', 'one'));

        $rel = EntryRelation::first();
        $this->actingAs($editor)->delete("/admin/entries/{$b->id}/relations/{$rel->id}")->assertSessionHas('success');
        $this->assertSame(0, EntryRelation::count());
    }

    public function test_media_upload_validation_duplicates_and_safe_delete()
    {
        Storage::fake('public');
        $editor = User::factory()->role('editor')->create();
        $meta = ['attribution' => 'Leonida Atlas', 'usage_status' => 'original', 'alt_en' => 'Test image'];

        $this->actingAs($editor)->post('/admin/media', ['file' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php'), ...$meta])->assertSessionHasErrors('file');
        $this->actingAs($editor)->post('/admin/media', ['file' => UploadedFile::fake()->image('a.png', 400, 300), ...$meta])->assertSessionHasNoErrors();
        $media = Media::where('kind', 'image')->firstOrFail();
        Storage::disk('public')->assertExists($media->path);
        $this->assertNotNull($media->thumb_path);

        $entry = $this->makeEntry('pictured');
        $entry->update(['hero_media_id' => $media->id]);
        $this->actingAs($editor)->delete("/admin/media/{$media->id}")->assertSessionHas('error');
        $this->assertDatabaseHas('media', ['id' => $media->id]);

        $entry->update(['hero_media_id' => null]);
        $this->actingAs($editor)->delete("/admin/media/{$media->id}")->assertSessionHas('success');
        $this->assertDatabaseMissing('media', ['id' => $media->id]);
    }

    public function test_map_markers_require_valid_coordinates_and_basis()
    {
        $editor = User::factory()->role('editor')->create();
        $entry = $this->makeEntry('pin');
        $base = ['entry_id' => $entry->id, 'category' => 'landmark', 'x' => 0.4, 'y' => 0.6, 'precision' => 'approximate', 'zoom' => 3, 'status' => 'published'];

        $this->actingAs($editor)->post('/admin/map/markers', [...$base, 'x' => 1.4])->assertSessionHasErrors('x');
        $this->actingAs($editor)->post('/admin/map/markers', $base)->assertSessionHasErrors('basis');
        $this->actingAs($editor)->post('/admin/map/markers', [...$base, 'basis' => 'Trailer skyline'])->assertSessionHasNoErrors();
        $this->getJson('/api/v1/map/markers')->assertJsonFragment(['basis' => 'Trailer skyline']);

        $this->actingAs($editor)->get('/admin/map/export')->assertOk()->assertJsonPath('format', 'leonida-atlas.markers.v1');
        $this->actingAs(User::factory()->role('translator', ['tr'])->create())->post('/admin/map/markers', [...$base, 'basis' => 'x'])->assertForbidden();
    }

    public function test_role_management_rules()
    {
        $admin = User::factory()->role('admin')->create();
        $member = User::factory()->create();

        $this->actingAs($admin)->put("/admin/users/{$member->id}", ['role' => 'super_admin', 'is_active' => true])->assertSessionHas('error');
        $this->actingAs($admin)->put("/admin/users/{$admin->id}", ['role' => 'member', 'is_active' => true])->assertSessionHas('error');
        $this->actingAs($admin)->put("/admin/users/{$member->id}", ['role' => 'translator', 'is_active' => true, 'translator_locales' => ['es']])->assertSessionHas('success');
        $this->assertSame(['es'], $member->fresh()->translator_locales);
        $this->assertTrue(AuditEvent::where('action', 'user.updated')->exists());

        $this->actingAs(User::factory()->role('editor')->create())->put("/admin/users/{$member->id}", ['role' => 'admin'])->assertForbidden();
        auth()->logout();
        $this->post('/register', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'role' => 'super_admin']);
        $this->assertSame('member', User::where('email', 'x@example.com')->value('role'));
    }

    public function test_settings_update_changes_public_branding()
    {
        $admin = User::factory()->role('super_admin')->create();
        $data = Settings::DEFAULTS;
        $data['site_name'] = 'Atlas Test';

        $this->actingAs($admin)->put('/admin/settings', [...$data, 'default_locale' => 'ru', 'enabled_locales' => ['en']])->assertSessionHas('error');
        $this->actingAs($admin)->put('/admin/settings', $data)->assertSessionHas('success');
        $this->get('/en')->assertInertia(fn ($p) => $p->where('site.name', 'Atlas Test'));
    }

    public function test_submission_review_creates_unverified_draft_only()
    {
        $editor = User::factory()->role('editor')->create();
        $submission = Submission::create(['user_id' => User::factory()->create()->id, 'kind' => 'new', 'entry_type' => 'mystery', 'locale' => 'en', 'title' => 'Hidden mural', 'body' => 'There is a mural in the trailer that looks like a clue.']);

        $this->actingAs($editor)->post("/admin/submissions/{$submission->id}/review", ['decision' => 'accept', 'create_draft' => true])->assertSessionHas('success');
        $entry = Entry::find($submission->fresh()->entry_id);
        $this->assertSame(['draft', 'unverified'], [$entry->status, $entry->verification]);
        $this->get('/en/easter-eggs/hidden-mural')->assertNotFound();
    }

    public function test_json_import_lands_as_drafts_and_rejects_invalid_files()
    {
        $editor = User::factory()->role('editor')->create();
        $good = json_encode(['format' => 'leonida-atlas.entries.v1', 'entries' => [['key' => 'imported-place', 'type' => 'location', 'verification' => 'reported', 't' => ['en' => ['title' => 'Imported Place']]]]]);
        $bad = json_encode(['format' => 'leonida-atlas.entries.v1', 'entries' => [['key' => 'x', 'type' => 'spaceship', 't' => ['en' => ['title' => 'X']]]]]);

        $this->actingAs($editor)->post('/admin/import', ['file' => UploadedFile::fake()->createWithContent('bad.json', $bad)])->assertSessionHas('error');
        $this->actingAs($editor)->post('/admin/import', ['file' => UploadedFile::fake()->createWithContent('good.json', $good)])->assertSessionHas('success');
        $this->assertSame('draft', Entry::where('key', 'imported-place')->value('status'));
    }

    public function test_admin_pages_render_for_super_admin()
    {
        $this->seedAtlas();
        $admin = User::factory()->role('super_admin')->create();
        $entry = Entry::where('key', 'jason-duval')->first();
        foreach (['/admin', '/admin/entries', "/admin/entries/{$entry->id}", '/admin/entries/create?type=vehicle', '/admin/translations', "/admin/translations/{$entry->id}/tr", '/admin/media', '/admin/map', '/admin/submissions', '/admin/users', '/admin/settings', '/admin/audit', '/admin/import', "/admin/entries/{$entry->id}/preview?locale=fr"] as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
        $this->actingAs($admin)->get('/admin')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }
}

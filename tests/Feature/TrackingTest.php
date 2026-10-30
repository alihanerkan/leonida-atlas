<?php

namespace Tests\Feature;

use App\Models\Entry;
use App\Models\User;
use App\Models\UserMarker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SeedsAtlas;
use Tests\TestCase;

class TrackingTest extends TestCase
{
    use RefreshDatabase, SeedsAtlas;

    public function test_guests_cannot_use_account_endpoints()
    {
        $this->getJson('/api/v1/me/state')->assertUnauthorized();
        $this->postJson('/api/v1/me/favorites/1')->assertUnauthorized();
    }

    public function test_users_can_track_progress_and_favorites()
    {
        $entry = $this->makeEntry('the-pier');
        $user = User::factory()->create();

        $this->actingAs($user)->postJson("/api/v1/me/favorites/{$entry->id}")->assertJson(['favorite' => true]);
        $this->actingAs($user)->postJson("/api/v1/me/progress/{$entry->id}")->assertJson(['done' => true]);
        $this->actingAs($user)->getJson('/api/v1/me/state')->assertJsonPath('favorites.0', $entry->id)->assertJsonPath('progress.0', $entry->id);
        $this->actingAs($user)->postJson("/api/v1/me/favorites/{$entry->id}")->assertJson(['favorite' => false]);
    }

    public function test_non_trackable_and_unpublished_entries_are_rejected()
    {
        $news = $this->makeEntry('some-news', 'news');
        $draft = $this->makeEntry('hidden', 'location', ['status' => 'draft']);
        $user = User::factory()->create();

        $this->actingAs($user)->postJson("/api/v1/me/progress/{$news->id}")->assertStatus(422);
        $this->actingAs($user)->postJson("/api/v1/me/favorites/{$draft->id}")->assertNotFound();
    }

    public function test_users_cannot_touch_other_users_markers()
    {
        $owner = User::factory()->create();
        $marker = $owner->markers()->create(['x' => 0.5, 'y' => 0.5, 'label' => 'Mine']);

        $this->actingAs(User::factory()->create())->deleteJson("/api/v1/me/markers/{$marker->id}")->assertNotFound();
        $this->assertDatabaseHas('user_markers', ['id' => $marker->id]);

        $this->actingAs($owner)->postJson('/api/v1/me/markers', ['x' => 1.5, 'y' => 0.2, 'label' => 'Bad'])->assertStatus(422);
    }

    public function test_anonymous_progress_import_only_accepts_published_entries()
    {
        $entry = $this->makeEntry('beach');
        $draft = $this->makeEntry('draft-beach', 'location', ['status' => 'draft']);
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/me/import', [
            'favorites' => [$entry->id, $draft->id, 999999],
            'progress' => [$entry->id],
            'markers' => [['x' => 0.1, 'y' => 0.2, 'label' => 'Local']],
        ])->assertOk()->assertJsonPath('imported.favorites', 1);

        $this->assertSame([$entry->id], $user->favorites()->pluck('entries.id')->all());
        $this->assertSame(1, UserMarker::where('user_id', $user->id)->count());
    }

    public function test_signed_in_users_can_submit_contributions()
    {
        $this->post('/submissions', [])->assertRedirect('/login');
        $user = User::factory()->create();
        $this->actingAs($user)->post('/submissions', ['kind' => 'new', 'locale' => 'en', 'title' => 'Hm', 'body' => 'short'])->assertSessionHasErrors(['title', 'body']);
        $this->actingAs($user)->post('/submissions', [
            'kind' => 'new', 'entry_type' => 'mystery', 'locale' => 'tr', 'title' => 'Billboard clue',
            'body' => 'A billboard in trailer 2 seems to reference an older game.', 'source_url' => 'https://example.com/x',
        ])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('submissions', ['title' => 'Billboard clue', 'status' => 'pending', 'user_id' => $user->id]);
        $this->assertNull(Entry::where('key', 'like', 'billboard-clue%')->first());
    }
}

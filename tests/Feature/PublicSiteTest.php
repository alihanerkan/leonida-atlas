<?php

namespace Tests\Feature;

use App\Models\Entry;
use App\Models\EntryTranslation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\SeedsAtlas;
use Tests\TestCase;

class PublicSiteTest extends TestCase
{
    use RefreshDatabase, SeedsAtlas;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedAtlas();
    }

    public function test_root_redirects_to_the_preferred_language()
    {
        $this->get('/', ['Accept-Language' => 'tr-TR,tr;q=0.9'])->assertRedirect('/tr');
        $this->get('/', ['Accept-Language' => 'zh-TW'])->assertRedirect('/zh-CN');
        $this->withUnencryptedCookie('atlas_locale', 'fr')->get('/', ['Accept-Language' => 'tr'])->assertRedirect('/fr');
    }

    public function test_homepage_renders_in_every_supported_language()
    {
        foreach (array_keys(config('atlas.locales')) as $locale) {
            $this->get("/$locale")->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('site/home')
                ->where('locale', $locale)
                ->has('regions', 6)
                ->has('meta.alternates.x-default'));
        }
    }

    public function test_section_segments_are_localized()
    {
        $this->get('/tr/araclar')->assertOk()->assertInertia(fn (Assert $p) => $p->component('site/section')->where('section', 'vehicles'));
        $this->get('/es/personajes')->assertOk();
        $this->get('/ru/karta')->assertOk()->assertInertia(fn (Assert $p) => $p->component('site/map'));
        $this->get('/tr/vehicles')->assertNotFound();
        $this->get('/de/vehicles')->assertNotFound();
    }

    public function test_translated_entry_uses_localized_slug_and_lists_alternates()
    {
        $this->get('/ru/personazhi/dzhejson-dyuval')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->component('site/entry')
            ->where('entry.title', 'Джейсон Дюваль')
            ->where('entry.fallback', false)
            ->where('entry.is_machine', true)
            ->where('switcher.en', '/en/characters/jason-duval')
            ->where('meta.noindex', false));
    }

    public function test_missing_translation_falls_back_to_english_with_noindex_and_canonical()
    {
        $this->get('/tr/karakterler/cal-hampton')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->where('entry.title', 'Cal Hampton')
            ->where('entry.fallback', true)
            ->where('meta.noindex', true)
            ->where('meta.canonical', rtrim(config('app.url'), '/').'/en/characters/cal-hampton'));
    }

    public function test_unpublished_content_is_never_public()
    {
        $draft = $this->makeEntry('secret-draft', 'location', ['status' => 'draft']);

        $this->get('/en/locations/secret-draft')->assertNotFound();
        $this->getJson("/api/v1/entries/{$draft->id}")->assertNotFound();
        $this->getJson('/api/v1/search?q=secret&locale=en')->assertOk()->assertJsonCount(0, 'data');

        $vice = Entry::where('key', 'vice-city')->first();
        EntryTranslation::where('entry_id', $vice->id)->where('locale', 'tr')->update(['status' => 'draft']);
        $this->get('/tr/konumlar/vice-city')->assertOk()->assertInertia(fn (Assert $p) => $p->where('entry.fallback', true));
    }

    public function test_search_is_case_accent_and_alias_aware()
    {
        $this->getJson('/api/v1/search?q='.rawurlencode('ДЖЕЙСОН').'&locale=ru')->assertOk()->assertJsonPath('data.0.key', 'jason-duval');
        $this->getJson('/api/v1/search?q=bae-luxe&locale=en')->assertOk()->assertJsonPath('data.0.key', 'real-dimez');
        $this->getJson('/api/v1/search?q=gator&locale=en&section=wildlife')->assertOk()->assertJsonPath('data.0.type', 'animal');
        $this->getJson('/api/v1/search?q=x')->assertStatus(422);
    }

    public function test_listing_filters_and_verification_facets()
    {
        $this->get('/en/easter-eggs?verification=debunked')->assertOk()->assertInertia(fn (Assert $p) => $p
            ->has('items', 1)
            ->where('items.0.verification', 'debunked')
            ->where('meta.noindex', true));
        $this->get('/en/vehicles?verification=nonsense')->assertSessionHasErrors('verification');
    }

    public function test_map_api_only_returns_published_markers()
    {
        $count = $this->getJson('/api/v1/map/markers?locale=en')->assertOk()->json('data');
        $this->assertCount(15, $count);
        $this->assertTrue(collect($count)->every(fn ($m) => $m['precision'] === 'approximate' && $m['basis']));
    }

    public function test_sitemaps_and_robots()
    {
        $this->get('/sitemap.xml')->assertOk()->assertSee('/sitemaps/zh-CN.xml', false);
        $this->get('/sitemaps/tr.xml')->assertOk()->assertSee('hreflang="ru"', false)->assertSee('/tr/karakterler/jason-duval', false);
        $this->get('/robots.txt')->assertOk()->assertSee('Disallow: /admin');
    }

    public function test_security_headers_are_sent()
    {
        $this->get('/en')->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}

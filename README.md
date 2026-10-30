# Leonida Atlas

An independent, multilingual Grand Theft Auto VI encyclopedia, interactive world atlas and content-management system.

> Leonida Atlas is a non-commercial fan project. It is not affiliated with, endorsed by or sponsored by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related marks are trademarks of Take-Two Interactive.

---

## Quick start

Requirements: PHP 8.2+ (with `pdo_sqlite` or `pdo_pgsql`, `gd`, `intl`, `mbstring`), Composer 2, Node 20+.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
# Optional: set ATLAS_ADMIN_PASSWORD (and ATLAS_DEMO_PASSWORD for local demo staff accounts) in .env
php artisan migrate --seed          # schema + researched demo dataset
php artisan storage:link            # public media uploads
npm run build                       # or: npm run dev
php artisan serve                   # http://127.0.0.1:8000
```

- Public site: `http://127.0.0.1:8000/` redirects to the visitor's language (cookie, then account preference, then `Accept-Language`, then English).
- Admin: `/admin`. Sign in with `ATLAS_ADMIN_EMAIL` / `ATLAS_ADMIN_PASSWORD`. If the password is empty, the seeder generates one and prints it once.
- Demo staff accounts (`editor@`, `translator@`, `contributor@leonida-atlas.test`) are created **only** in `local`/`testing` environments, and only when `ATLAS_DEMO_PASSWORD` is set.

No credentials are hard-coded anywhere.

### Checks

```bash
php artisan test        # 59 feature tests (public site, i18n fallback, privacy, RBAC, CMS workflows)
npm run types           # TypeScript
npm run lint            # ESLint
npm run build           # production bundle
npm run test:e2e        # Playwright: 8 widths (320–1920px) × 13 pages + interaction tests (needs a running server)
```

---

## Stack and key decisions

| Area | Choice | Why |
|---|---|---|
| Backend | Laravel 12, PHP 8.4 | Requested stack; auth, validation, policies, rate limiting and queues built in. |
| Frontend | React 19 + TypeScript via **Inertia 2** | One app with server routing, sessions and CSRF, without a separate SPA/API auth layer. |
| Styling | Tailwind 4 + shadcn/ui (admin primitives) | Design tokens in `resources/css/app.css`. |
| Motion | Motion for React (components, reveals, panels) + GSAP ScrollTrigger (hero parallax, pinned horizontal regions) | GSAP loads only in the homepage chunk. Motion and GSAP never animate the same element. |
| i18n | i18next / react-i18next, JSON dictionaries in `resources/locales` | The same JSON files are read by PHP (`App\Support\Dictionary`) for server-rendered meta tags. |
| Map | Custom image map with `react-zoom-pan-pinch` | Leonida is fictional, so there are no real lat/lng and MapLibre isn't needed. Normalised 0–1 coordinates, pinch/drag/keyboard, clustering. |
| Database | SQLite locally, PostgreSQL-ready | The local Postgres instance required credentials I didn't have; migrations are portable. Set `DB_CONNECTION=pgsql` to switch. |
| Search | Database search on a normalised `search_text` column | Case- and accent-insensitive for Turkish, Russian and accented Latin text on both SQLite and Postgres. A search engine can replace `SearchService` later. |
| SEO | Meta, canonical, `hreflang`, Open Graph and JSON-LD rendered server-side in `app.blade.php` | Crawlers get correct metadata without JavaScript; an optional SSR entry exists (`npm run build:ssr`). |

Fonts are self-hosted via Fontsource: Anton for display, Oswald for Cyrillic display, Inter for body text. Chinese uses system CJK fonts to avoid multi-megabyte downloads.

---

## Architecture

```
app/
  Http/Controllers/Site     Public pages (localized routing, listings, entry pages, map, sitemaps, submissions)
  Http/Controllers/Api      /api/v1 public read API + /api/v1/me personal tracking (session auth, CSRF)
  Http/Controllers/Admin    CMS: entries, translations, media, map editor, submissions, users, settings, audit, import
  Services/EntryPresenter   Shapes published content for public pages; owns the translation-fallback rule
  Services/EntryService     Single write path for entries: revisions, verification history, audit events
  Services/ContentImporter  Idempotent structured import (seeders + admin JSON import)
  Services/SearchService    Language-aware ranked search
  Support/                  Locales, Settings (cached), Dictionary, Seo, Audit, SearchText
config/atlas.php            Locales, localized URL segments, content types, verification states, permission matrix
database/seeders/data/*.json  Researched dataset (sources, characters, places, encyclopedia, media/news, graph)
resources/js/
  pages/site/*  pages/admin/*  components/{site,home,map,art,admin}  lib/motion.ts (animation vocabulary)
resources/locales/*.json    Public UI in 7 languages · locales/admin/{en,tr}.json for the CMS
```

### URLs and languages

`/{locale}/{localized-section}/{localized-slug}`, for example `/en/vehicles`, `/tr/araclar`, `/ru/personazhi/dzhejson-dyuval`. All locales map to the same `entries` row. Segment maps are in `config/atlas.php` (Chinese uses English segments for readable ASCII URLs).

**Fallback rule:** when a published translation is missing, the page shows the English source with a visible "not yet translated" notice. It is marked `noindex`, its canonical points at the English URL, and it is excluded from that locale's sitemap. Machine-assisted translations are labelled as unreviewed until an editor marks them reviewed.

### Content model (main tables)

`entries` (stable key, type, status, verification, confidence, spoiler level, region, attributes) → `entry_translations` (one per locale: title, slug, summary, body, structured `fields`, aliases, SEO, status, machine flag, reviewer). Type-specific tables: `character_profiles`, `vehicle_specs` (stats nullable; *unknown is never estimated*), `weapon_specs`, `mission_details`. Evidence: `sources` (deduplicated by URL hash) + `entry_source` (evidence note, role) + `verification_events`. Graph: `entry_relations`, `tags`, `categories`. Media: `media` + `entry_media`. Map: `map_markers` (normalised x/y, precision, approximation basis, zoom). Users: `user_favorites`, `user_progress`, `user_markers`, `user_lists`, `submissions`. System: `entry_revisions`, `audit_events`, `settings`.

### Roles and permissions (enforced server-side via Gates)

| Role | Can do |
|---|---|
| Super admin / Admin | Everything, including users, roles, settings and the audit log (only a super admin can grant super admin) |
| Editor | Create, edit, publish, verify, delete/restore content; media, map, relations, submissions, translations |
| Translator | Edit translations in **assigned languages only**; cannot publish or change settings |
| Contributor | Draft entries, which are forced into review; cannot publish |
| Member | Public site, favourites, progress, personal markers, submissions |

The full matrix is in `config/atlas.php` and is shown in **Admin → Users & roles**.

### Security

Session auth with CSRF on all writes. Per-endpoint rate limits (search, API, writes, uploads, submissions). Role, active and translator-locale fields are not mass-assignable. Image uploads are validated by MIME, extension, size and dimensions, renamed to UUIDs, deduplicated by SHA-256 and thumbnailed. Media still referenced by an entry cannot be deleted. Body text renders as React text nodes, never as HTML. Security headers (nosniff, frame options, referrer policy, permissions policy) apply everywhere, with HSTS and CSP in production. Admin responses carry `noindex` and `no-store`. Deactivated users cannot sign in. The public API never returns unpublished entries or translations.

---

## Deployment notes

- **PostgreSQL:** set the `DB_*` variables, then run `php artisan migrate --seed`.
- **S3-compatible media:** set `ATLAS_MEDIA_DISK=s3` and the `AWS_*` variables. Credentials stay in the environment, never in the database.
- **Queues:** `QUEUE_CONNECTION=database` is configured. Run `php artisan queue:work` if you add async jobs such as machine translation.
- **Caching:** `php artisan config:cache route:cache view:cache`. Settings are cached and invalidated on save.
- **Backups:** back up the database and `storage/app/public` (uploaded media). The seed dataset in `database/seeders/data` is versioned and re-runnable, because imports are idempotent by key.
- Set `APP_URL` correctly, since canonical, `hreflang` and sitemap URLs are absolute.

---

## Research report (as of 29 October 2026)

**Imported:** 57 entries (8 characters, 6 regions, 4 locations, 6 vehicles, 1 weapon, 2 story threads, 6 mysteries, 5 wildlife, 7 activities and mechanics, 4 trailers, 8 news), 105 translations, 28 sources, 68 relationships, 15 map markers, 52 tags.

**Evidence mix:** 26 official, 5 strong evidence, 22 reported, 2 theory, 1 rumour, 1 debunked.

**Sources:** Rockstar's GTA VI site and Newswire, the official YouTube uploads of Trailers 1 and 2, Wikipedia (timeline and cast summary), and press including IGN, BBC, The Guardian, Kotaku, Forbes, IBTimes UK, PCGamesN, Den of Geek, Dexerto, Push Square, OpenCritic, The Drive, Traxion and Miami New Times. Community sources include GTABoom and Sportskeeda wildlife lists. The full list is at `/en/sources`.

**Translations:** the public UI is complete in all 7 languages (485 keys each). Eight high-value entries are translated into all 7 languages: Jason, Lucia, Vice City, Leonida Keys, Grassrivers, Trailer 1, Trailer 2 and the release-date news. They are flagged as machine-assisted and unreviewed. The other 49 entries are English-only and fall back with a notice. The admin UI is in English and Turkish; other languages fall back to English.

**Visual assets:** no illustrations. The homepage plays the official trailer through YouTube's embed, and trailer entries use YouTube's official thumbnails. Other official artwork is added by the site owner with `atlas:import-official` (see above). The only drawn element is the Leonida map, a schematic labelled "not to scale, not the official map" until Rockstar publishes one.

**Limitations and unverified information**
- Character bios are paraphrased from Rockstar's profiles as reported by secondary sources; the official site is JavaScript-rendered and could not be read verbatim.
- Vehicle names (Cheetah, Declasse Tulip, Seashark, Nightblade) are community and press identifications, labelled *reported*. No performance stats exist yet, so all are blank.
- All map positions are *approximate*, with a stated basis. Region placement follows official real-world analogues or community analysis, not a map; leaked map material was deliberately not used.
- Extended Look and Launch Trailer details (activities, Criminal Profile, Justice single) come from press coverage and are labelled *reported*.
- Collectibles: none are verified before release, so the module is empty by design and the tracking infrastructure is ready.
- Seed text was drafted with AI assistance from the cited sources and is awaiting human editorial review (noted on each record's research notes and on the About page).

## Official artwork

The site uses no illustrations. Visuals come from official sources only:

- **Hero:** the latest official trailer plays muted through YouTube's privacy-enhanced embed; reduced-motion and data-saver visitors see YouTube's official thumbnail.
- **Trailer entries:** the official YouTube thumbnail of that trailer.
- **Everything else:** official artwork the site owner chooses to publish. Save images into a folder named after entry keys (`lucia-caminos.jpg`, `jason-duval.jpg`, `vice-city.jpg` …) or homepage slots (`hero-1.jpg` … `hero-6.jpg`), then run:

```bash
php artisan atlas:import-official ~/Downloads/gta6-art
# single file: php artisan atlas:attach-image lucia-caminos path/to/file.jpg --attribution="© Rockstar Games" --source=https://www.rockstargames.com/VI/media/artwork-wallpapers
```

Each image is stored with its credit and source and shown with attribution. Until an entry has artwork it shows a neutral typographic placeholder. Publishing Rockstar artwork is the site owner's decision; check Rockstar's fan-content policy before going public.

## Known limitations / next steps

- Mission walkthroughs, collectibles and stats depend on the 19 November 2026 release.
- Machine translation provider: the setting exists but is disabled; no provider is integrated.
- Custom user lists have API endpoints but no UI yet. Email delivery uses the `log` mailer until SMTP is configured.
- The automated research pipeline (news monitoring, duplicate-story detection) is not implemented; the JSON import + review queue is the current workflow.
- Inertia SSR is wired but optional; SEO meta is already server-rendered without it.

## Official screenshots

`public/media/screens` holds official Rockstar Games screenshots and Trailer 2 frames (WebP, 1920 px and 960 px),
credited "© Rockstar Games". `database/seeders/data/screens.json` lists them and links the ones whose subject is
certain to entries (hero image + gallery). `php artisan db:seed --class=ScreensSeeder` registers them.

## Deploying to Render

The repo ships a `Dockerfile` (FrankenPHP, PHP 8.4) and a `render.yaml` blueprint.

1. In Render choose **New → Blueprint** and pick this GitHub repository.
2. Render generates `APP_KEY` and `ATLAS_ADMIN_PASSWORD`; read the password under the service's **Environment** tab.
3. Sign in at `/login` with `admin@leonida-atlas.test` and that password.

The free plan has no persistent disk: each deploy or restart starts from the seeded SQLite database, so CMS edits
made in production are lost on redeploy. Attach a Render disk (and set `DB_DATABASE` to a path on it) or a Postgres
database to keep them.

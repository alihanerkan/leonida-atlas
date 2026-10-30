<?php

return [

    'default_locale' => 'en',

    // Order matters: it is the order shown in language selectors.
    'locales' => [
        'en' => ['name' => 'English', 'native' => 'English', 'intl' => 'en-US', 'og' => 'en_US'],
        'tr' => ['name' => 'Turkish', 'native' => 'Türkçe', 'intl' => 'tr-TR', 'og' => 'tr_TR'],
        'es' => ['name' => 'Spanish', 'native' => 'Español', 'intl' => 'es-ES', 'og' => 'es_ES'],
        'zh-CN' => ['name' => 'Chinese (Simplified)', 'native' => '简体中文', 'intl' => 'zh-CN', 'og' => 'zh_CN'],
        'it' => ['name' => 'Italian', 'native' => 'Italiano', 'intl' => 'it-IT', 'og' => 'it_IT'],
        'fr' => ['name' => 'French', 'native' => 'Français', 'intl' => 'fr-FR', 'og' => 'fr_FR'],
        'ru' => ['name' => 'Russian', 'native' => 'Русский', 'intl' => 'ru-RU', 'og' => 'ru_RU'],
    ],

    /*
     * Localized URL segments. Chinese uses English segments so URLs stay ASCII-readable;
     * entry slugs remain localized per translation.
     */
    'sections' => [
        'map' => ['en' => 'map', 'tr' => 'harita', 'es' => 'mapa', 'zh-CN' => 'map', 'it' => 'mappa', 'fr' => 'carte', 'ru' => 'karta'],
        'vehicles' => ['en' => 'vehicles', 'tr' => 'araclar', 'es' => 'vehiculos', 'zh-CN' => 'vehicles', 'it' => 'veicoli', 'fr' => 'vehicules', 'ru' => 'transport'],
        'characters' => ['en' => 'characters', 'tr' => 'karakterler', 'es' => 'personajes', 'zh-CN' => 'characters', 'it' => 'personaggi', 'fr' => 'personnages', 'ru' => 'personazhi'],
        'locations' => ['en' => 'locations', 'tr' => 'konumlar', 'es' => 'lugares', 'zh-CN' => 'locations', 'it' => 'luoghi', 'fr' => 'lieux', 'ru' => 'lokatsii'],
        'missions' => ['en' => 'missions', 'tr' => 'gorevler', 'es' => 'misiones', 'zh-CN' => 'missions', 'it' => 'missioni', 'fr' => 'missions', 'ru' => 'missii'],
        'easter-eggs' => ['en' => 'easter-eggs', 'tr' => 'gizemler', 'es' => 'secretos', 'zh-CN' => 'easter-eggs', 'it' => 'segreti', 'fr' => 'secrets', 'ru' => 'pashalki'],
        'weapons' => ['en' => 'weapons', 'tr' => 'silahlar', 'es' => 'armas', 'zh-CN' => 'weapons', 'it' => 'armi', 'fr' => 'armes', 'ru' => 'oruzhie'],
        'collectibles' => ['en' => 'collectibles', 'tr' => 'koleksiyon', 'es' => 'coleccionables', 'zh-CN' => 'collectibles', 'it' => 'collezionabili', 'fr' => 'collection', 'ru' => 'kollektsii'],
        'wildlife' => ['en' => 'wildlife', 'tr' => 'yaban-hayati', 'es' => 'fauna', 'zh-CN' => 'wildlife', 'it' => 'fauna', 'fr' => 'faune', 'ru' => 'fauna'],
        'world' => ['en' => 'world', 'tr' => 'dunya', 'es' => 'mundo', 'zh-CN' => 'world', 'it' => 'mondo', 'fr' => 'monde', 'ru' => 'mir'],
        'news' => ['en' => 'news', 'tr' => 'haberler', 'es' => 'noticias', 'zh-CN' => 'news', 'it' => 'notizie', 'fr' => 'actualites', 'ru' => 'novosti'],
        'search' => ['en' => 'search', 'tr' => 'ara', 'es' => 'buscar', 'zh-CN' => 'search', 'it' => 'cerca', 'fr' => 'recherche', 'ru' => 'poisk'],
        'tracker' => ['en' => 'my-atlas', 'tr' => 'atlasim', 'es' => 'mi-atlas', 'zh-CN' => 'my-atlas', 'it' => 'il-mio-atlas', 'fr' => 'mon-atlas', 'ru' => 'moy-atlas'],
        'compare' => ['en' => 'compare', 'tr' => 'karsilastir', 'es' => 'comparar', 'zh-CN' => 'compare', 'it' => 'confronta', 'fr' => 'comparer', 'ru' => 'sravnenie'],
        'about' => ['en' => 'about', 'tr' => 'hakkinda', 'es' => 'acerca-de', 'zh-CN' => 'about', 'it' => 'chi-siamo', 'fr' => 'a-propos', 'ru' => 'o-proekte'],
        'sources' => ['en' => 'sources', 'tr' => 'kaynaklar', 'es' => 'fuentes', 'zh-CN' => 'sources', 'it' => 'fonti', 'fr' => 'sources', 'ru' => 'istochniki'],
        'legal' => ['en' => 'legal', 'tr' => 'yasal', 'es' => 'legal', 'zh-CN' => 'legal', 'it' => 'note-legali', 'fr' => 'mentions-legales', 'ru' => 'pravo'],
        'contribute' => ['en' => 'contribute', 'tr' => 'katki', 'es' => 'contribuir', 'zh-CN' => 'contribute', 'it' => 'contribuisci', 'fr' => 'contribuer', 'ru' => 'predlozhit'],
    ],

    // Encyclopedia sections and the content types they list.
    'content_sections' => [
        'characters' => ['character'],
        'vehicles' => ['vehicle'],
        'locations' => ['region', 'location'],
        'missions' => ['mission'],
        'easter-eggs' => ['mystery'],
        'weapons' => ['weapon'],
        'collectibles' => ['collectible'],
        'wildlife' => ['animal'],
        'world' => ['activity'],
        'news' => ['news', 'trailer'],
    ],

    'types' => [
        'character' => ['section' => 'characters', 'trackable' => false],
        'vehicle' => ['section' => 'vehicles', 'trackable' => true],
        'region' => ['section' => 'locations', 'trackable' => true],
        'location' => ['section' => 'locations', 'trackable' => true],
        'mission' => ['section' => 'missions', 'trackable' => true],
        'mystery' => ['section' => 'easter-eggs', 'trackable' => true],
        'weapon' => ['section' => 'weapons', 'trackable' => true],
        'animal' => ['section' => 'wildlife', 'trackable' => true],
        'collectible' => ['section' => 'collectibles', 'trackable' => true],
        'activity' => ['section' => 'world', 'trackable' => true],
        'trailer' => ['section' => 'news', 'trackable' => false],
        'news' => ['section' => 'news', 'trackable' => false],
    ],

    'statuses' => ['draft', 'review', 'published', 'archived'],

    'translation_statuses' => ['draft', 'review', 'published'],

    // Ordered from most to least certain.
    'verification' => ['official', 'verified_in_game', 'strong_evidence', 'reported', 'rumor', 'theory', 'unverified', 'debunked'],

    'spoiler_levels' => ['none', 'minor', 'major'],

    'confidence' => ['high', 'medium', 'low'],

    'relation_types' => ['related', 'appears_in', 'located_in', 'associated_with', 'drives', 'features', 'clue_for', 'debunks'],

    'marker_categories' => ['region', 'landmark', 'business', 'mission', 'vehicle', 'mystery', 'wildlife', 'activity', 'collectible'],

    'media_usage' => ['original', 'licensed', 'official_artwork', 'official_embed', 'permission_pending', 'placeholder'],

    'roles' => ['super_admin', 'admin', 'editor', 'translator', 'contributor', 'member'],

    /*
     * Permission matrix, enforced server-side through Gates (see AuthServiceProvider logic in AppServiceProvider).
     */
    'permissions' => [
        'admin.access' => ['super_admin', 'admin', 'editor', 'translator', 'contributor'],
        'content.view' => ['super_admin', 'admin', 'editor', 'translator', 'contributor'],
        'content.create' => ['super_admin', 'admin', 'editor', 'contributor'],
        'content.edit' => ['super_admin', 'admin', 'editor'],
        'content.publish' => ['super_admin', 'admin', 'editor'],
        'content.delete' => ['super_admin', 'admin', 'editor'],
        'content.verify' => ['super_admin', 'admin', 'editor'],
        'translations.edit' => ['super_admin', 'admin', 'editor', 'translator'],
        'translations.publish' => ['super_admin', 'admin', 'editor'],
        'media.manage' => ['super_admin', 'admin', 'editor'],
        'media.upload' => ['super_admin', 'admin', 'editor', 'contributor'],
        'map.edit' => ['super_admin', 'admin', 'editor'],
        'relations.edit' => ['super_admin', 'admin', 'editor'],
        'submissions.review' => ['super_admin', 'admin', 'editor'],
        'users.manage' => ['super_admin', 'admin'],
        'settings.manage' => ['super_admin', 'admin'],
        'audit.view' => ['super_admin', 'admin'],
    ],

    'release_date' => '2026-11-19',

    // Local development convenience only: prefill the login form with the seeded admin account.
    'prefill_login' => env('ATLAS_PREFILL_LOGIN', false),
    'admin_email' => env('ATLAS_ADMIN_EMAIL'),
    'admin_password' => env('ATLAS_ADMIN_PASSWORD'),

    'media' => [
        'disk' => env('ATLAS_MEDIA_DISK', 'public'),
        'max_kb' => 8192,
        'mimes' => ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        'thumb_width' => 640,
    ],
];

export type Verification = 'official' | 'verified_in_game' | 'strong_evidence' | 'reported' | 'rumor' | 'theory' | 'unverified' | 'debunked';
export type EntryType =
    | 'character'
    | 'vehicle'
    | 'region'
    | 'location'
    | 'mission'
    | 'mystery'
    | 'weapon'
    | 'animal'
    | 'collectible'
    | 'activity'
    | 'trailer'
    | 'news';
export type SectionKey =
    | 'map'
    | 'vehicles'
    | 'characters'
    | 'locations'
    | 'missions'
    | 'easter-eggs'
    | 'weapons'
    | 'collectibles'
    | 'wildlife'
    | 'world'
    | 'news'
    | 'search'
    | 'tracker'
    | 'compare'
    | 'about'
    | 'sources'
    | 'legal'
    | 'contribute';

export interface MediaItem {
    id: number;
    kind: 'image' | 'embed' | 'art';
    url: string | null;
    thumb: string | null;
    width: number | null;
    height: number | null;
    focal_x?: number | null;
    embed_provider: string | null;
    embed_id: string | null;
    art_preset: string | null;
    title: string | null;
    alt: string | null;
    caption: string | null;
    attribution: string | null;
    source_url: string | null;
    usage_status: string;
    license: string | null;
    role?: string;
}

export interface EntryLink {
    id: number;
    type: EntryType;
    title: string;
    url: string;
}

export interface EntryCard {
    id: number;
    key: string;
    type: EntryType;
    section: SectionKey;
    title: string;
    slug: string;
    url: string;
    summary: string | null;
    locale: string;
    fallback: boolean;
    verification: Verification;
    confidence: 'high' | 'medium' | 'low';
    spoiler_level: 'none' | 'minor' | 'major';
    featured: boolean;
    art: string | null;
    hero: MediaItem | null;
    still?: string | null;
    event_date: string | null;
    category: { key: string; name: string } | null;
    region: EntryLink | null;
    meta: Record<string, string>;
    trackable: boolean;
    relation?: string;
    relation_note?: string | null;
    score?: number;
    video?: { provider: string; id: string } | null;
    specs?: Record<string, string | number | boolean | null> | null;
}

export interface SourceRef {
    title: string;
    url: string;
    publisher: string | null;
    type: string;
    published_on: string | null;
    accessed_on: string | null;
    note: string | null;
    supports: string;
}

export interface EntryFull extends EntryCard {
    body: string | null;
    fields: Record<string, unknown>;
    aliases: string[];
    is_machine: boolean;
    translation_reviewed: boolean;
    updated_at: string | null;
    last_verified_at: string | null;
    published_at: string | null;
    attributes: Record<string, unknown>;
    specs: Record<string, string | number | boolean | null> | null;
    tags: { key: string; name: string }[];
    sources: SourceRef[];
    verification_history: { from: string | null; to: string; note: string | null; date: string | null }[];
    gallery: MediaItem[];
    markers: { id: number; x: number; y: number; precision: string; category: string }[];
    related: Record<string, EntryCard[]>;
    alternates: Record<string, string>;
    switcher: Record<string, string | null>;
}

export interface MapMarkerData {
    id: number;
    x: number;
    y: number;
    category: string;
    precision: 'confirmed' | 'approximate';
    basis: string | null;
    zoom: number;
    entry: EntryCard;
}

export interface UserMarker {
    id: number | string;
    x: number;
    y: number;
    label: string;
    note?: string | null;
    color?: string;
}

export interface SeoMeta {
    title: string;
    description?: string;
    canonical?: string;
    alternates?: Record<string, string>;
    noindex?: boolean;
    og_type?: string;
    image?: string;
}

export interface AtlasUser {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    email_verified_at: string | null;
    permissions: string[];
    translator_locales: string[] | null;
}

export interface AtlasShared {
    name: string;
    site: {
        name: string;
        tagline: string | null;
        release_date: string;
        features: Record<string, boolean>;
        social_links: Record<string, string>;
        homepage_sections: string[];
        disclaimer: string | null;
    };
    locale: string;
    locales: { code: string; native: string; name: string; intl: string }[];
    sections: Record<SectionKey, Record<string, string>>;
    sectionCounts?: Record<string, number>;
    auth: { user: AtlasUser | null };
    flash: { success?: string | null; error?: string | null };
    meta?: SeoMeta;
    switcher?: Record<string, string | null>;
    [key: string]: unknown;
}

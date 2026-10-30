import type { AtlasShared, SectionKey, Verification } from '@/types/atlas';

export function sectionUrl(sections: AtlasShared['sections'], locale: string, section?: SectionKey | null, slug?: string | null): string {
    let path = `/${locale}`;
    if (section) path += `/${sections[section]?.[locale] ?? sections[section]?.en ?? section}`;
    if (slug) path += `/${encodeURIComponent(slug)}`;
    return path;
}

/** Maps the current path to the same page in another locale (non-entry pages). */
export function localizedPath(sections: AtlasShared['sections'], from: string, to: string, pathname: string, search = ''): string {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== from) return `/${to}`;
    const segment = parts[1];
    if (!segment) return `/${to}${search}`;
    const section = (Object.keys(sections) as SectionKey[]).find((s) => sections[s][from] === segment);
    if (!section) return `/${to}`;
    const slug = parts[2];
    return sectionUrl(sections, to, section, slug ? decodeURIComponent(slug) : null) + search;
}

export const VERIFICATION_ORDER: Verification[] = [
    'official',
    'verified_in_game',
    'strong_evidence',
    'reported',
    'rumor',
    'theory',
    'unverified',
    'debunked',
];

/** Visual tone per evidence level. Confirmed facts are calm; speculation is warmer; debunked is struck. */
export const VERIFICATION_TONE: Record<string, { dot: string; text: string; ring: string; bg: string }> = {
    official: { dot: 'bg-mint', text: 'text-mint', ring: 'ring-mint/40', bg: 'bg-mint/10' },
    verified_in_game: { dot: 'bg-mint', text: 'text-mint', ring: 'ring-mint/40', bg: 'bg-mint/10' },
    strong_evidence: { dot: 'bg-electric', text: 'text-electric', ring: 'ring-electric/40', bg: 'bg-electric/10' },
    reported: { dot: 'bg-violet', text: 'text-violet', ring: 'ring-violet/40', bg: 'bg-violet/10' },
    rumor: { dot: 'bg-sunset', text: 'text-sunset', ring: 'ring-sunset/40', bg: 'bg-sunset/10' },
    theory: { dot: 'bg-neon', text: 'text-neon', ring: 'ring-neon/40', bg: 'bg-neon/10' },
    unverified: { dot: 'bg-haze', text: 'text-haze', ring: 'ring-haze/40', bg: 'bg-haze/10' },
    debunked: { dot: 'bg-alert', text: 'text-alert', ring: 'ring-alert/40', bg: 'bg-alert/10' },
    unknown: { dot: 'bg-haze', text: 'text-haze', ring: 'ring-haze/30', bg: 'bg-haze/5' },
};

export function intlLocale(locales: AtlasShared['locales'], code: string): string {
    return locales.find((l) => l.code === code)?.intl ?? code;
}

export function formatDate(value: string | null | undefined, intl: string, style: 'long' | 'short' = 'long'): string {
    if (!value) return '';
    const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(intl, style === 'long' ? { dateStyle: 'long', timeZone: 'UTC' } : { dateStyle: 'medium', timeZone: 'UTC' }).format(
        date,
    );
}

export function formatNumber(value: number, intl: string): string {
    return new Intl.NumberFormat(intl).format(value);
}

export function hostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/** Splits body text into blocks: paragraphs, "## " headings and "- " bullet lists. Rendered as text, never HTML. */
export type BodyBlock = { kind: 'p'; text: string } | { kind: 'h'; text: string } | { kind: 'ul'; items: string[] };
export function parseBody(body: string | null | undefined): BodyBlock[] {
    if (!body) return [];
    return body
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk): BodyBlock => {
            if (chunk.startsWith('## ')) return { kind: 'h', text: chunk.slice(3) };
            const lines = chunk.split('\n');
            if (lines.every((l) => l.trim().startsWith('- '))) return { kind: 'ul', items: lines.map((l) => l.trim().slice(2)) };
            return { kind: 'p', text: chunk.replace(/\n/g, ' ') };
        });
}

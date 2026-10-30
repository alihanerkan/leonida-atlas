import { EmptyState } from '@/components/site/empty-state';
import { EntryCard } from '@/components/site/entry-card';
import { PageHero } from '@/components/site/page-hero';
import { RevealGroup, RevealItem } from '@/components/site/reveal';
import { VerificationBadge } from '@/components/site/verification-badge';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { VERIFICATION_ORDER } from '@/lib/atlas';
import { cn } from '@/lib/utils';
import type { AtlasShared, EntryCard as Card, SectionKey } from '@/types/atlas';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface Props extends AtlasShared {
    section: SectionKey;
    items: Card[];
    pagination: { current: number; last: number; total: number; prev: string | null; next: string | null };
    filters: Record<string, string | undefined>;
    facets: {
        verification: Record<string, number>;
        tags: { key: string; name: string }[];
        regions: Card[];
        classes: string[];
        types: string[];
    };
}

const ART: Partial<Record<SectionKey, string>> = {
    characters: 'portrait-pink',
    vehicles: 'car-muscle',
    locations: 'skyline',
    missions: 'mission',
    'easter-eggs': 'mystery',
    weapons: 'weapon',
    collectibles: 'mystery',
    wildlife: 'animal-flamingo',
    world: 'activity-radio',
    news: 'news',
};

const VARIANT: Partial<Record<SectionKey, 'poster' | 'landscape' | 'case'>> = { characters: 'poster', 'easter-eggs': 'case' };

export default function Section() {
    const { section, items, pagination, filters, facets } = usePage<Props>().props;
    const { t, url, date } = useAtlas();
    const [showFilters, setShowFilters] = useState(false);
    const base = url(section);

    const apply = (patch: Record<string, string | undefined>) => {
        const next = { ...filters, ...patch, page: undefined };
        const query = Object.fromEntries(
            Object.entries(next).filter(([k, v]) => v && !(k === 'sort' && v === (section === 'news' ? 'recent' : 'featured'))),
        );
        router.get(base, query as unknown as Record<string, string>, {
            preserveScroll: true,
            preserveState: true,
            only: ['items', 'pagination', 'filters', 'meta'],
        });
    };
    const active = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'page');
    const variant = VARIANT[section] ?? 'landscape';
    const isNews = section === 'news';

    const filterPanel = (
        <div className="space-y-6">
            {Object.keys(facets.verification).length > 1 && (
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('list.verification')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {VERIFICATION_ORDER.filter((v) => facets.verification[v]).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => apply({ verification: filters.verification === v ? undefined : v })}
                                aria-pressed={filters.verification === v}
                                className={cn('rounded-full transition-opacity', filters.verification && filters.verification !== v && 'opacity-40')}
                            >
                                <VerificationBadge status={v} />
                                <span className="sr-only"> ({facets.verification[v]})</span>
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}
            {facets.types.length > 1 && (
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('list.type')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {facets.types.map((ty) => (
                            <FilterChip key={ty} active={filters.type === ty} onClick={() => apply({ type: filters.type === ty ? undefined : ty })}>
                                {t(`types.${ty}`)}
                            </FilterChip>
                        ))}
                    </div>
                </fieldset>
            )}
            {facets.classes.length > 1 && (
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('list.class')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {facets.classes.map((c) => (
                            <FilterChip key={c} active={filters.class === c} onClick={() => apply({ class: filters.class === c ? undefined : c })}>
                                {t(`vehicle_class.${c}`)}
                            </FilterChip>
                        ))}
                    </div>
                </fieldset>
            )}
            {facets.regions.length > 0 && (
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('list.region')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {facets.regions.map((r) => (
                            <FilterChip
                                key={r.id}
                                active={filters.region === String(r.id)}
                                onClick={() => apply({ region: filters.region === String(r.id) ? undefined : String(r.id) })}
                            >
                                {r.title}
                            </FilterChip>
                        ))}
                    </div>
                </fieldset>
            )}
            {facets.tags.length > 0 && (
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('list.tag')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {facets.tags.slice(0, 24).map((tag) => (
                            <FilterChip
                                key={tag.key}
                                active={filters.tag === tag.key}
                                onClick={() => apply({ tag: filters.tag === tag.key ? undefined : tag.key })}
                            >
                                {tag.name}
                            </FilterChip>
                        ))}
                    </div>
                </fieldset>
            )}
        </div>
    );

    return (
        <SiteLayout>
            <PageHero
                kicker={t(`sections.${section}.kicker`)}
                title={t(`nav.${section}`)}
                intro={t(`sections.${section}.description`)}
                art={ART[section]}
            >
                {section === 'vehicles' && (
                    <Link
                        href={url('compare')}
                        className="bg-paper text-ink hover:bg-neon hover:text-paper inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold"
                    >
                        {t('list.compare_cta')}
                    </Link>
                )}
            </PageHero>

            <div className="safe-px mx-auto max-w-[1600px] py-10 lg:px-8 lg:py-14">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-subtle text-sm" aria-live="polite">
                        {t('list.results', { count: pagination.total })}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className="border-line inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium lg:hidden"
                            aria-expanded={showFilters}
                            aria-controls="filters"
                        >
                            <SlidersHorizontal className="size-4" /> {t('list.filters')}
                            {active.length > 0 && <span className="bg-neon text-ink rounded-full px-1.5 text-xs">{active.length}</span>}
                        </button>
                        <label className="sr-only" htmlFor="sort">
                            {t('list.sort')}
                        </label>
                        <select
                            id="sort"
                            value={filters.sort}
                            onChange={(e) => apply({ sort: e.target.value })}
                            className="border-line bg-surface min-h-11 rounded-full border px-4 text-sm"
                        >
                            <option value="featured">{t('list.sort_featured')}</option>
                            <option value="az">{t('list.sort_az')}</option>
                            <option value="recent">{t('list.sort_recent')}</option>
                            <option value="verification">{t('list.sort_verification')}</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
                    <aside id="filters" className={cn('lg:block', showFilters ? 'block' : 'hidden')} aria-label={t('list.filters')}>
                        <div className="lg:sticky lg:top-28">
                            {filterPanel}
                            {active.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => router.get(base)}
                                    className="text-neon mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
                                >
                                    <X className="size-4" /> {t('list.clear')}
                                </button>
                            )}
                        </div>
                    </aside>

                    <div>
                        {items.length === 0 ? (
                            <EmptyState
                                title={active.length ? t('list.empty_filtered') : t(`sections.${section}.empty`)}
                                action={
                                    active.length ? (
                                        <button
                                            type="button"
                                            onClick={() => router.get(base)}
                                            className="bg-neon text-ink min-h-11 rounded-full px-5 text-sm font-semibold"
                                        >
                                            {t('list.clear')}
                                        </button>
                                    ) : undefined
                                }
                            />
                        ) : isNews ? (
                            <RevealGroup as="ol" className="divide-line border-line divide-y border-y">
                                {items.map((n) => (
                                    <RevealItem as="li" key={n.id}>
                                        <Link href={n.url} className="group grid gap-2 py-6 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-8">
                                            <time className="label-caps text-subtle" dateTime={n.event_date ?? undefined}>
                                                {date(n.event_date)}
                                            </time>
                                            <span>
                                                <span className="label-caps text-neon">{t(`types.${n.type}`)}</span>
                                                <span className="group-hover:text-neon mt-1 block text-xl font-semibold text-balance">{n.title}</span>
                                                {n.summary && (
                                                    <span className="text-subtle mt-2 block max-w-3xl text-sm leading-relaxed">{n.summary}</span>
                                                )}
                                            </span>
                                            <VerificationBadge status={n.verification} size="xs" />
                                        </Link>
                                    </RevealItem>
                                ))}
                            </RevealGroup>
                        ) : (
                            <RevealGroup
                                className={cn(
                                    'grid gap-x-6 gap-y-10',
                                    variant === 'poster'
                                        ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
                                        : variant === 'case'
                                          ? 'gap-y-6 sm:grid-cols-2 xl:grid-cols-3'
                                          : 'sm:grid-cols-2 xl:grid-cols-3',
                                )}
                            >
                                {items.map((item, i) => (
                                    <RevealItem key={item.id}>
                                        <EntryCard entry={item} variant={variant} priority={i < 3} />
                                    </RevealItem>
                                ))}
                            </RevealGroup>
                        )}

                        {pagination.last > 1 && (
                            <nav
                                className="mt-12 flex items-center justify-between gap-4"
                                aria-label={t('list.page_of', { current: pagination.current, last: pagination.last })}
                            >
                                {pagination.prev ? (
                                    <Link
                                        href={pagination.prev}
                                        preserveScroll={false}
                                        className="border-line inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm"
                                        rel="prev"
                                    >
                                        <ChevronLeft className="size-4" /> {t('list.prev')}
                                    </Link>
                                ) : (
                                    <span />
                                )}
                                <span className="text-subtle text-sm">
                                    {t('list.page_of', { current: pagination.current, last: pagination.last })}
                                </span>
                                {pagination.next ? (
                                    <Link
                                        href={pagination.next}
                                        className="border-line inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm"
                                        rel="next"
                                    >
                                        {t('list.next')} <ChevronRight className="size-4" />
                                    </Link>
                                ) : (
                                    <span />
                                )}
                            </nav>
                        )}
                    </div>
                </div>
            </div>
        </SiteLayout>
    );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'min-h-9 rounded-full border px-3.5 text-sm transition-colors',
                active ? 'border-neon bg-neon text-ink' : 'border-line hover:border-text/40',
            )}
        >
            {children}
        </button>
    );
}

import { EmptyState } from '@/components/site/empty-state';
import { EntryCard } from '@/components/site/entry-card';
import { MediaFrame } from '@/components/site/media-frame';
import { PageHero } from '@/components/site/page-hero';
import { Highlight } from '@/components/site/search-palette';
import { VerificationBadge } from '@/components/site/verification-badge';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import type { AtlasShared, EntryCard as Card } from '@/types/atlas';
import { Link, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface Props extends AtlasShared {
    q: string;
    section: string | null;
    results: Card[];
    suggestions: Card[];
}

export default function SearchPage() {
    const { q, results, suggestions } = usePage<Props>().props;
    const { t, url } = useAtlas();
    const [value, setValue] = useState(q);

    return (
        <SiteLayout>
            <PageHero title={t('search.title')} art="mystery" compact>
                <form
                    role="search"
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(url('search'), value.trim() ? { q: value.trim() } : {});
                    }}
                    className="border-line bg-surface focus-within:border-neon flex max-w-2xl items-center gap-2 rounded-full border p-1.5 pl-5"
                >
                    <Search className="text-subtle size-5 shrink-0" aria-hidden />
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        name="q"
                        maxLength={100}
                        placeholder={t('search.placeholder')}
                        aria-label={t('search.placeholder')}
                        className="min-h-11 flex-1 bg-transparent outline-none"
                    />
                    <button type="submit" className="bg-neon text-ink min-h-11 rounded-full px-5 text-sm font-semibold">
                        {t('nav.search')}
                    </button>
                </form>
            </PageHero>
            <div className="safe-px mx-auto max-w-5xl py-12 lg:px-8">
                {q && (
                    <p className="text-subtle mb-6 text-sm" aria-live="polite">
                        {t('search.results_for', { count: results.length, q })}
                    </p>
                )}
                {q && results.length === 0 && <EmptyState title={t('search.no_results', { q })} body={t('search.no_results_hint')} />}
                {results.length > 0 && (
                    <ol className="divide-line divide-y">
                        {results.map((r) => (
                            <li key={r.id}>
                                <Link href={r.url} className="group flex gap-4 py-5">
                                    <MediaFrame
                                        media={r.hero}
                                        still={r.still}
                                        art={r.art}
                                        type={r.type}
                                        label={r.title}
                                        className="size-20 shrink-0 rounded-xl sm:size-24"
                                    />
                                    <div className="min-w-0">
                                        <p className="label-caps text-subtle">{t(`types.${r.type}`)}</p>
                                        <p className="group-hover:text-neon mt-1 text-lg font-semibold">
                                            <Highlight text={r.title} query={q} />
                                        </p>
                                        {r.summary && (
                                            <p className="text-subtle mt-1 line-clamp-2 text-sm">
                                                <Highlight text={r.summary} query={q} />
                                            </p>
                                        )}
                                        <VerificationBadge status={r.verification} size="xs" className="mt-2" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ol>
                )}
                {(!q || results.length === 0) && suggestions.length > 0 && (
                    <section className="mt-12">
                        <h2 className="label-caps text-subtle mb-6">{t('search.suggestions')}</h2>
                        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                            {suggestions.map((s) => (
                                <EntryCard key={s.id} entry={s} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </SiteLayout>
    );
}

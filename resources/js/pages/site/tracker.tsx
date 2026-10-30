import { EmptyState } from '@/components/site/empty-state';
import { EntryCard } from '@/components/site/entry-card';
import { ProgressToggle } from '@/components/site/favorite-button';
import { PageHero } from '@/components/site/page-hero';
import { useAtlas } from '@/hooks/use-atlas';
import { useTracking } from '@/hooks/use-tracking';
import SiteLayout from '@/layouts/site-layout';
import { api } from '@/lib/http';
import type { AtlasShared, EntryCard as Card } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { CloudUpload, Info } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

interface Props extends AtlasShared {
    entries: Card[];
}

export default function Tracker() {
    return (
        <SiteLayout>
            <TrackerContent />
        </SiteLayout>
    );
}

function TrackerContent() {
    const { entries } = usePage<Props>().props;
    const { t, user, num, locale } = useAtlas();
    const { favorites, progress, pendingLocal, importLocal, ready } = useTracking();
    const reduced = useReducedMotion();
    const done = entries.filter((e) => progress.has(e.id)).length;
    const pct = entries.length ? Math.round((done / entries.length) * 100) : 0;
    const [favs, setFavs] = useState<Card[]>([]);
    const favKey = [...favorites].sort((a, b) => a - b).join(',');
    useEffect(() => {
        if (!favKey) return setFavs([]);
        const controller = new AbortController();
        api<{ data: Card[] }>(`/api/v1/entries?per_page=100&locale=${locale}&ids=${favKey}`, { signal: controller.signal })
            .then((r) => setFavs(r.data))
            .catch(() => undefined);
        return () => controller.abort();
    }, [favKey, locale]);
    const bySection = Object.entries(
        entries.reduce<Record<string, Card[]>>((acc, e) => {
            (acc[e.section] ??= []).push(e);
            return acc;
        }, {}),
    );

    return (
        <>
            <PageHero kicker={t('nav.tracker')} title={t('tracker.title')} intro={t('tracker.intro')} art="activity-profile" compact />
            <div className="safe-px mx-auto max-w-[1600px] space-y-14 py-12 lg:px-8">
                <div className="border-line bg-surface/50 flex items-start gap-3 rounded-2xl border p-4 text-sm">
                    <Info className="text-electric mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>
                        {user ? t('tracker.signed_in_notice') : t('tracker.anonymous_notice')}{' '}
                        {!user && (
                            <Link href="/login" className="text-neon font-semibold">
                                {t('tracker.sign_in_to_sync')}
                            </Link>
                        )}
                    </p>
                </div>

                {user && pendingLocal > 0 && (
                    <div className="border-electric/40 bg-electric/10 flex flex-col gap-4 rounded-3xl border p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-semibold">{t('tracker.import_title')}</p>
                            <p className="text-subtle mt-1 text-sm">{t('tracker.import_body', { count: pendingLocal })}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void importLocal()}
                            className="bg-electric text-ink inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
                        >
                            <CloudUpload className="size-4" /> {t('tracker.import_cta')}
                        </button>
                    </div>
                )}

                <section aria-labelledby="progress-title" className="grid gap-8 lg:grid-cols-3">
                    <div className="border-line rounded-3xl border p-8">
                        <h2 id="progress-title" className="label-caps text-subtle">
                            {t('tracker.progress')}
                        </h2>
                        <p className="font-display mt-4 text-8xl leading-none">
                            {ready ? num(pct) : '–'}
                            <span className="text-subtle text-4xl">%</span>
                        </p>
                        <p className="text-subtle mt-2 text-sm">
                            {num(done)} / {num(entries.length)} {t('tracker.completed').toLowerCase()}
                        </p>
                        <div
                            className="bg-line mt-6 h-2 overflow-hidden rounded-full"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <motion.div
                                className="from-neon to-sunset h-full rounded-full bg-gradient-to-r"
                                initial={{ width: reduced ? `${pct}%` : 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1.2 }}
                            />
                        </div>
                    </div>
                    <div className="space-y-4 lg:col-span-2">
                        <h2 className="label-caps text-subtle">{t('tracker.by_section')}</h2>
                        {bySection.map(([section, items]) => {
                            const d = items.filter((i) => progress.has(i.id)).length;
                            return (
                                <details key={section} className="group border-line rounded-2xl border">
                                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5">
                                        <span className="flex-1 font-semibold">{t(`nav.${section}`)}</span>
                                        <span className="tabular text-subtle text-sm">
                                            {d}/{items.length}
                                        </span>
                                        <span className="bg-line h-1.5 w-24 overflow-hidden rounded-full sm:w-40">
                                            <span className="bg-mint block h-full" style={{ width: `${(d / items.length) * 100}%` }} />
                                        </span>
                                    </summary>
                                    <ul className="divide-line border-line divide-y border-t">
                                        {items.map((i) => (
                                            <li key={i.id} className="flex items-center gap-3 px-3 py-1">
                                                <div className="min-w-0 flex-1">
                                                    <EntryCard entry={i} variant="row" showFavorite={false} />
                                                </div>
                                                <ProgressToggle entryId={i.id} compact />
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            );
                        })}
                    </div>
                </section>

                <section aria-labelledby="fav-title">
                    <h2 id="fav-title" className="font-display text-huge uppercase">
                        {t('tracker.favorites')}
                    </h2>
                    {favs.length === 0 ? (
                        <EmptyState className="mt-6" title={t('tracker.favorites')} body={t('tracker.empty_favorites')} />
                    ) : (
                        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                            {favs.map((f) => (
                                <EntryCard key={f.id} entry={f} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

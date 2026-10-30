import { MediaFrame } from '@/components/site/media-frame';
import { useAtlas } from '@/hooks/use-atlas';
import { VERIFICATION_ORDER, VERIFICATION_TONE } from '@/lib/atlas';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { EntryCard, MediaItem, SectionKey } from '@/types/atlas';
import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Homepage cover: editorial title on the left, a sunlit panel (palm-frond shadows or official art) on the right. */
export function Cover({ artwork, truth }: { artwork: MediaItem[]; truth: Record<string, number> }) {
    const { t, url, site } = useAtlas();
    const reduced = useReducedMotion();
    const art = artwork[0];
    const [first, ...rest] = site.name.toUpperCase().split(' ');

    return (
        <section className="safe-px mx-auto max-w-[1440px] pt-20 pb-10 lg:px-6 lg:pt-24" aria-labelledby="cover-title">
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
                <div className="border-line bg-surface/60 relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 sm:p-8 lg:min-h-[560px]">
                    <div className="flex items-center justify-between gap-4">
                        <p className="label-caps text-peach">{t('home.cover_issue')}</p>
                        <span className="meta-caps text-subtle hidden sm:inline">{new Date().getFullYear()}</span>
                    </div>
                    <div className="mt-10">
                        <h1 id="cover-title" className="font-display text-mega leading-[0.86] uppercase">
                            <motion.span
                                className="block"
                                initial={reduced ? false : { opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.9, ease: ease.cinema }}
                            >
                                {first}
                            </motion.span>
                            {rest.length > 0 && (
                                <motion.span
                                    className="vi-text block"
                                    initial={reduced ? false : { opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.9, ease: ease.cinema, delay: 0.12 }}
                                >
                                    {rest.join(' ')}
                                </motion.span>
                            )}
                        </h1>
                        <p className="text-text/85 mt-5 max-w-md text-[15px] leading-relaxed text-pretty">{t('home.hero_intro')}</p>
                        <div className="mt-6 flex flex-wrap gap-2.5">
                            <Link
                                href={url('map')}
                                className="group bg-paper text-ink hover:bg-peach inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors"
                            >
                                {t('home.cta_explore')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <Link
                                href={url('characters')}
                                className="border-line hover:border-text/50 inline-flex h-11 items-center rounded-full border px-5 text-sm font-medium transition-colors"
                            >
                                {t('home.cta_browse')}
                            </Link>
                        </div>
                    </div>
                    <div className="border-line mt-10 flex flex-wrap items-end justify-between gap-6 border-t pt-5">
                        <div>
                            <p className="label-caps text-subtle mb-2 text-[15px]">{t('home.countdown_label')}</p>
                            <Countdown target={site.release_date} />
                        </div>
                    </div>
                </div>

                <div className="vi-gradient relative min-h-[320px] overflow-hidden rounded-2xl lg:min-h-[560px]">
                    {art ? (
                        <figure className="absolute inset-3 overflow-hidden rounded-xl sm:inset-4">
                            <MediaFrame media={art} className="h-full w-full" priority />
                            <figcaption className="bg-ink/70 text-paper/80 absolute right-3 bottom-3 rounded px-2 py-1 text-[10px]">
                                {art.attribution}
                            </figcaption>
                        </figure>
                    ) : (
                        <>
                            <span className="palm-shadow pointer-events-none absolute -top-10 -left-16 size-[34rem] opacity-30" aria-hidden />
                            <span
                                className="palm-shadow pointer-events-none absolute -right-24 -bottom-24 size-[28rem] rotate-180 opacity-20 [animation-duration:13s]"
                                aria-hidden
                            />
                            <div className="text-ink absolute right-6 bottom-6 left-6">
                                <p className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.85] uppercase">Vice City, USA</p>
                                <p className="label-caps text-ink/70 mt-2">{t('home.artwork_pending')}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <TruthScale truth={truth} />
        </section>
    );
}

/** Signature element: the whole atlas as one bar, split by how certain each entry is. */
export function TruthScale({ truth }: { truth: Record<string, number> }) {
    const { t, num } = useAtlas();
    const reduced = useReducedMotion();
    const [hover, setHover] = useState<string | null>(null);
    const levels = VERIFICATION_ORDER.filter((v) => truth[v]);
    const total = levels.reduce((a, v) => a + truth[v], 0) || 1;
    const focus = hover ?? levels[0];

    return (
        <div className="border-line mt-5 rounded-2xl border p-5 sm:p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="font-display text-2xl uppercase">{t('home.truth_title')}</h2>
                <p className="text-subtle max-w-lg text-sm">{t('home.truth_note')}</p>
            </div>
            <div className="mt-5 flex h-12 overflow-hidden rounded-lg" role="list" aria-label={t('home.truth_title')}>
                {levels.map((v, i) => (
                    <motion.div
                        key={v}
                        role="listitem"
                        className="min-w-[10px]"
                        style={{ flexGrow: truth[v] }}
                        initial={reduced ? false : { scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: ease.cinema }}
                    >
                        <button
                            type="button"
                            onMouseEnter={() => setHover(v)}
                            onFocus={() => setHover(v)}
                            onClick={() => setHover(v)}
                            aria-pressed={focus === v}
                            className={cn(
                                'block h-full w-full origin-left transition-opacity',
                                VERIFICATION_TONE[v].dot,
                                hover && hover !== v ? 'opacity-35' : 'opacity-100',
                            )}
                            aria-label={`${t(`verification.${v}`)}: ${truth[v]}`}
                        />
                    </motion.div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <p className="font-display text-4xl tabular-nums">
                    {Math.round(((truth[focus] ?? 0) / total) * 100)}
                    <span className="text-subtle text-xl">%</span>
                </p>
                <p className="text-sm">
                    <span className={cn('font-semibold', VERIFICATION_TONE[focus]?.text)}>{t(`verification.${focus}`)}</span>
                    <span className="text-subtle">
                        {' '}
                        — {t(`verification_desc.${focus}`)} ({num(truth[focus] ?? 0)})
                    </span>
                </p>
            </div>
        </div>
    );
}

const INDEX: SectionKey[] = ['characters', 'locations', 'vehicles', 'easter-eggs', 'missions', 'wildlife', 'world', 'news'];

/** Table of contents in the style of a magazine index, with live counts. */
export function IndexStrip({ counts }: { counts: Record<string, number> }) {
    const { t, url } = useAtlas();
    return (
        <section className="safe-px mx-auto max-w-[1440px] py-10 lg:px-6" aria-labelledby="index-title">
            <h2 id="index-title" className="label-caps text-peach mb-4">
                {t('home.index_title')}
            </h2>
            <ol className="border-line grid grid-cols-2 border-t sm:grid-cols-4">
                {INDEX.map((s, i) => (
                    <li
                        key={s}
                        className="border-line border-b sm:[&:not(:nth-child(4n))]:border-r sm:[&:nth-child(4n+1)]:border-l-0 [&:nth-child(odd)]:border-r sm:[&:nth-child(odd)]:border-r-0"
                    >
                        <Link
                            href={url(s)}
                            className="group hover:bg-surface/70 flex h-full flex-col justify-between gap-6 p-4 transition-colors sm:p-5"
                        >
                            <span className="text-subtle flex items-center justify-between text-xs tabular-nums">
                                {String(i + 1).padStart(2, '0')}
                                <ArrowUpRight className="group-hover:text-neon size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                            <span>
                                <span className="font-display block text-xl leading-none uppercase sm:text-2xl">{t(`nav.${s}`)}</span>
                                <span className="text-subtle mt-1 block text-xs">
                                    {counts[s] ? t('nav.entries', { count: counts[s] }) : t('nav.soon')}
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/** Compact region grid: one large lead region, the rest in a tight mosaic. */
export function RegionsGrid({ regions }: { regions: EntryCard[] }) {
    const { t, url } = useAtlas();
    const [lead, ...others] = regions;
    if (!lead) return null;
    return (
        <section id="home-world" className="safe-px mx-auto max-w-[1440px] py-14 lg:px-6" aria-labelledby="regions-title">
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <p className="label-caps text-peach">{t('home.world_kicker').replace(/^\d+\s*—\s*/, '')}</p>
                    <h2 id="regions-title" className="font-display text-huge mt-1 leading-none uppercase">
                        {t('home.world_title')}
                    </h2>
                </div>
                <Link href={url('locations')} className="text-neon hidden text-sm font-semibold sm:inline">
                    {t('common.view_all')} →
                </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2">
                <RegionTile entry={lead} className="md:col-span-2 md:row-span-2" large />
                {others.slice(0, 5).map((r, i) => (
                    <RegionTile key={r.id} entry={r} className={cn(i === 0 && 'md:col-span-2')} />
                ))}
            </div>
        </section>
    );
}

function RegionTile({ entry, className, large = false }: { entry: EntryCard; className?: string; large?: boolean }) {
    return (
        <Link
            href={entry.url}
            className={cn(
                'group relative block overflow-hidden rounded-xl',
                large ? 'aspect-[4/3] md:aspect-auto md:min-h-[440px]' : 'aspect-[16/10] md:aspect-auto md:min-h-[214px]',
                className,
            )}
        >
            <MediaFrame
                media={entry.hero}
                still={entry.still}
                type={entry.type}
                label={entry.title}
                className="absolute inset-0"
                imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div className="from-ink/85 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            <div className="absolute right-4 bottom-4 left-4">
                <h3 className={cn('font-display text-paper leading-none uppercase', large ? 'text-4xl' : 'text-2xl')}>{entry.title}</h3>
                {large && entry.summary && <p className="text-paper/80 mt-2 line-clamp-2 max-w-md text-sm">{entry.summary}</p>}
            </div>
        </Link>
    );
}

export function Countdown({ target }: { target: string }) {
    const { t, num } = useAtlas();
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const end = new Date(`${target}T00:00:00-05:00`).getTime();
    const diff = now === null ? null : Math.max(0, end - now);
    if (diff === 0) return <p className="font-display text-3xl uppercase">{t('home.released')}</p>;
    const parts =
        diff === null
            ? [null, null, null, null]
            : [Math.floor(diff / 864e5), Math.floor(diff / 36e5) % 24, Math.floor(diff / 6e4) % 60, Math.floor(diff / 1e3) % 60];
    const labels = [t('home.days'), t('home.hours'), t('home.minutes'), t('home.seconds')];
    return (
        <div className="flex items-end gap-4 sm:gap-6" role="timer" aria-live="off">
            {parts.map((v, i) => (
                <div key={i}>
                    <div className="tabular font-display text-3xl leading-none sm:text-4xl">
                        {v === null ? '––' : i === 0 ? num(v) : String(v).padStart(2, '0')}
                    </div>
                    <div className="meta-caps text-paper/60 mt-1.5 text-[9px]">{labels[i]}</div>
                </div>
            ))}
        </div>
    );
}

import { AtlasMap } from '@/components/map/atlas-map';
import { EntryCard as Card, metaLine } from '@/components/site/entry-card';
import { MediaFrame } from '@/components/site/media-frame';
import { Reveal, RevealGroup, RevealItem } from '@/components/site/reveal';
import { SectionHeading } from '@/components/site/section-heading';
import { StatBar } from '@/components/site/stat-bar';
import { VerificationBadge } from '@/components/site/verification-badge';
import { YouTubeEmbed } from '@/components/site/youtube-embed';
import { useAtlas } from '@/hooks/use-atlas';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { EntryCard, MapMarkerData } from '@/types/atlas';
import { useGSAP } from '@gsap/react';
import { Link, router } from '@inertiajs/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { animate, AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const container = 'safe-px mx-auto max-w-[1600px] lg:px-8';

/* ------------------------------------------------------------------ Stats */

function Counter({ value }: { value: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true });
    const reduced = useReducedMotion();
    const { num } = useAtlas();
    const [shown, setShown] = useState(reduced ? value : 0);
    useEffect(() => {
        if (!inView || reduced) return;
        const controls = animate(0, value, { duration: 1.6, ease: ease.cinema, onUpdate: (v) => setShown(Math.round(v)) });
        return () => controls.stop();
    }, [inView, value, reduced]);
    return (
        <span ref={ref} className="tabular">
            {num(shown)}
        </span>
    );
}

export function StatsStrip({ stats }: { stats: Record<string, number> }) {
    const { t } = useAtlas();
    const items = [
        ['entries', t('home.stats_entries')],
        ['sources', t('home.stats_sources')],
        ['translations', t('home.stats_translations')],
        ['markers', t('home.stats_markers')],
    ] as const;
    return (
        <section className="border-line bg-surface/40 border-y">
            <div className={cn(container, 'grid grid-cols-2 gap-y-8 py-10 md:grid-cols-5 md:py-14')}>
                <div className="col-span-2 md:col-span-1 md:pr-6">
                    <p className="label-caps text-neon">{t('home.honesty_title')}</p>
                    <p className="text-subtle mt-2 text-sm leading-relaxed">{t('home.honesty_note')}</p>
                </div>
                {items.map(([k, label]) => (
                    <div key={k} className="md:border-line md:border-l md:pl-6">
                        <p className="font-display text-5xl leading-none md:text-6xl">
                            <Counter value={stats[k] ?? 0} />
                        </p>
                        <p className="label-caps text-subtle mt-2">{label}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ World (horizontal storytelling) */

export function WorldSection({ regions }: { regions: EntryCard[] }) {
    const { t, url } = useAtlas();
    const section = useRef<HTMLElement>(null);
    const track = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            // Pinned horizontal scroll only on large screens with motion allowed; touch devices scroll natively.
            mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
                const el = track.current!;
                const distance = () => el.scrollWidth - window.innerWidth;
                const tween = gsap.to(el, {
                    x: () => -distance(),
                    ease: 'none',
                    scrollTrigger: {
                        trigger: section.current,
                        start: 'top top',
                        end: () => `+=${distance()}`,
                        scrub: 0.6,
                        pin: true,
                        invalidateOnRefresh: true,
                        anticipatePin: 1,
                    },
                });
                gsap.utils.toArray<HTMLElement>('[data-panel-art]').forEach((art) => {
                    gsap.fromTo(
                        art,
                        { scale: 1.18 },
                        {
                            scale: 1,
                            ease: 'none',
                            scrollTrigger: { trigger: art, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
                        },
                    );
                });
            });
            return () => mm.revert();
        },
        { scope: section, dependencies: [regions.length] },
    );

    return (
        <section
            ref={section}
            id="home-world"
            className="bg-canvas relative overflow-hidden py-20 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:py-0"
        >
            <div className={cn(container, 'mb-10 lg:mb-8')}>
                <SectionHeading
                    kicker={t('home.world_kicker')}
                    title={t('home.world_title')}
                    intro={t('home.world_intro')}
                    action={
                        <Link href={url('locations')} className="text-neon inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                            {t('common.view_all')} <ArrowRight className="size-4" />
                        </Link>
                    }
                />
            </div>
            <div
                ref={track}
                className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:gap-6 lg:snap-none lg:overflow-visible lg:px-8 lg:pb-0"
            >
                {regions.map((r, i) => (
                    <Link
                        key={r.id}
                        href={r.url}
                        className="group relative block h-[62svh] max-h-[620px] min-h-[380px] w-[82vw] shrink-0 snap-center overflow-hidden rounded-3xl ring-1 ring-white/5 sm:w-[60vw] lg:h-[56vh] lg:w-[44vw] xl:w-[38vw]"
                    >
                        <div data-panel-art className="absolute inset-0 will-change-transform">
                            <MediaFrame media={r.hero} still={r.still} art={r.art} type={r.type} label={r.title} className="h-full w-full" />
                        </div>
                        <div className="from-ink via-ink/30 absolute inset-0 bg-gradient-to-t to-transparent" />
                        <span className="font-display text-paper/25 absolute top-5 left-6 text-7xl leading-none">
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="absolute top-5 right-5">
                            <VerificationBadge status={r.verification} size="xs" className="bg-ink/70 backdrop-blur" />
                        </div>
                        <div className="text-paper absolute right-6 bottom-6 left-6">
                            <h3 className="font-display text-3xl leading-[0.95] uppercase sm:text-4xl">{r.title}</h3>
                            {r.summary && <p className="text-paper/80 mt-3 line-clamp-3 max-w-md text-sm leading-relaxed">{r.summary}</p>}
                            <span className="text-neon mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                                {t('common.read_more')}{' '}
                                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                        </div>
                    </Link>
                ))}
                <div className="w-1 shrink-0 lg:w-[8vw]" aria-hidden />
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Characters */

export function CharactersSection({ characters }: { characters: EntryCard[] }) {
    const { t, url } = useAtlas();
    const reduced = useReducedMotion();
    const leads = characters.filter((c) => c.meta.character_role === 'protagonist').slice(0, 2);
    const cast = characters.filter((c) => c.meta.character_role !== 'protagonist');

    return (
        <section className="relative overflow-hidden py-16 md:py-20">
            <div className={container}>
                <SectionHeading kicker={t('home.characters_kicker')} title={t('home.characters_title')} intro={t('home.characters_intro')} />
                <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
                    {leads.map((c, i) => (
                        <motion.div
                            key={c.id}
                            initial={reduced ? { opacity: 0 } : { clipPath: i === 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }}
                            whileInView={reduced ? { opacity: 1 } : { clipPath: 'inset(0 0% 0 0%)' }}
                            viewport={{ once: true, margin: '-15% 0px' }}
                            transition={{ duration: 1.4, ease: ease.cinema, delay: i * 0.15 }}
                            className={cn(i === 1 && 'md:mt-24')}
                        >
                            <Link href={c.url} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl">
                                <MediaFrame
                                    media={c.hero}
                                    still={c.still}
                                    art={c.art}
                                    type={c.type}
                                    label={c.title}
                                    className="absolute inset-0"
                                    imgClassName="transition-transform duration-[1600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                                />
                                <div className="from-ink via-ink/10 absolute inset-0 bg-gradient-to-t to-transparent" />
                                <div className="text-paper absolute right-6 bottom-6 left-6 md:right-8 md:bottom-8 md:left-8">
                                    <p className="label-caps text-neon">{metaLine(c, t)}</p>
                                    <h3 className="font-display mt-2 text-4xl leading-[0.9] uppercase md:text-5xl">{c.title}</h3>
                                    {c.summary && (
                                        <p className="text-paper/80 mt-4 line-clamp-3 max-w-md text-sm leading-relaxed md:text-base">{c.summary}</p>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
                <RevealGroup className="no-scrollbar -mx-4 mt-10 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
                    {cast.map((c) => (
                        <RevealItem key={c.id} className="w-[46vw] shrink-0 snap-start sm:w-[32vw] md:w-auto">
                            <Card entry={c} variant="poster" />
                        </RevealItem>
                    ))}
                </RevealGroup>
                <div className="mt-8">
                    <Link href={url('characters')} className="text-neon inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                        {t('common.view_all')} <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Vehicles (showroom) */

export function VehiclesSection({ vehicles }: { vehicles: EntryCard[] }) {
    const { t, url } = useAtlas();
    const reduced = useReducedMotion();
    const classes = useMemo(() => ['all', ...Array.from(new Set(vehicles.map((v) => v.meta.vehicle_class).filter(Boolean)))], [vehicles]);
    const [cls, setCls] = useState('all');
    const list = cls === 'all' ? vehicles : vehicles.filter((v) => v.meta.vehicle_class === cls);
    const [activeId, setActiveId] = useState<number | null>(vehicles[0]?.id ?? null);
    const active = list.find((v) => v.id === activeId) ?? list[0];

    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const srx = useSpring(rx, { stiffness: 120, damping: 14 });
    const sry = useSpring(ry, { stiffness: 120, damping: 14 });
    const shineBg = useTransform(sry, (v) => {
        const p = 50 + v * 4;
        return `linear-gradient(105deg, transparent ${p - 20}%, rgba(255,255,255,0.18) ${p}%, transparent ${p + 20}%)`;
    });

    if (!active) return null;

    return (
        <section className="bg-surface/30 relative overflow-hidden py-16 md:py-20">
            <div className={container}>
                <SectionHeading
                    kicker={t('home.vehicles_kicker')}
                    title={t('home.vehicles_title')}
                    intro={t('home.vehicles_intro')}
                    action={
                        <Link
                            href={url('compare')}
                            className="border-line hover:border-neon inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold"
                        >
                            {t('list.compare_cta')}
                        </Link>
                    }
                />
                <div role="tablist" aria-label={t('list.class')} className="no-scrollbar mt-10 flex gap-2 overflow-x-auto">
                    {classes.map((c) => (
                        <button
                            key={c}
                            role="tab"
                            type="button"
                            aria-selected={cls === c}
                            onClick={() => {
                                setCls(c);
                                const first = (c === 'all' ? vehicles : vehicles.filter((v) => v.meta.vehicle_class === c))[0];
                                if (first) setActiveId(first.id);
                            }}
                            className={cn(
                                'relative min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors',
                                cls === c ? 'text-ink' : 'text-subtle hover:text-text',
                            )}
                        >
                            {cls === c && (
                                <motion.span
                                    layoutId="vehicle-tab"
                                    className="bg-paper absolute inset-0 rounded-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                                />
                            )}
                            <span className="relative">{c === 'all' ? t('list.all') : t(`vehicle_class.${c}`)}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 grid gap-8 lg:grid-cols-12">
                    <div
                        className="lg:col-span-8"
                        style={{ perspective: 1200 }}
                        onPointerMove={(e) => {
                            if (reduced || e.pointerType !== 'mouse') return;
                            const r = e.currentTarget.getBoundingClientRect();
                            ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
                            rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
                        }}
                        onPointerLeave={() => {
                            rx.set(0);
                            ry.set(0);
                        }}
                    >
                        <motion.div style={reduced ? undefined : { rotateX: srx, rotateY: sry }} className="relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={active.id}
                                    initial={{ opacity: 0, x: reduced ? 0 : 60 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: reduced ? 0 : -60 }}
                                    transition={{ duration: 0.6, ease: ease.cinema }}
                                >
                                    <Link
                                        href={active.url}
                                        className="group relative block aspect-[16/10] overflow-hidden rounded-3xl ring-1 ring-white/5"
                                    >
                                        <MediaFrame
                                            media={active.hero}
                                            still={active.still}
                                            art={active.art}
                                            type={active.type}
                                            label={active.title}
                                            className="absolute inset-0"
                                        />
                                        <motion.div
                                            className="pointer-events-none absolute inset-0 mix-blend-overlay"
                                            style={{ background: shineBg }}
                                        />
                                        <div className="from-ink/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                                        <div className="text-paper absolute right-6 bottom-6 left-6 flex flex-wrap items-end justify-between gap-4">
                                            <div>
                                                <p className="label-caps text-paper/70">{metaLine(active, t)}</p>
                                                <h3 className="font-display text-4xl uppercase md:text-6xl">{active.title}</h3>
                                            </div>
                                            <VerificationBadge status={active.verification} className="bg-ink/70 backdrop-blur" />
                                        </div>
                                    </Link>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </div>
                    <div className="lg:col-span-4">
                        <ul className="space-y-1" aria-label={t('nav.vehicles')}>
                            {list.map((v) => (
                                <li key={v.id}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveId(v.id)}
                                        onFocus={() => setActiveId(v.id)}
                                        aria-current={v.id === active.id}
                                        className={cn(
                                            'flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors',
                                            v.id === active.id ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                                        )}
                                    >
                                        <span>
                                            <span className="block font-semibold">{v.title}</span>
                                            <span className="text-subtle text-xs">{metaLine(v, t)}</span>
                                        </span>
                                        {v.id === active.id && <motion.span layoutId="vehicle-dot" className="bg-neon size-2 rounded-full" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="border-line mt-6 space-y-4 rounded-2xl border p-5">
                            {(['top_speed', 'acceleration', 'handling'] as const).map((s) => (
                                <StatBar key={s} label={t(`specs.${s}`)} value={null} unknownLabel={t('compare.stat_unknown')} />
                            ))}
                            <p className="text-subtle text-xs leading-relaxed">{t('entry.stats_unknown_note')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Mysteries (case board) */

const COLUMNS: { key: string; statuses: string[] }[] = [
    { key: 'evidence', statuses: ['official', 'verified_in_game', 'strong_evidence', 'reported'] },
    { key: 'theory', statuses: ['theory', 'unverified'] },
    { key: 'noise', statuses: ['rumor', 'debunked'] },
];

export function MysteriesSection({ mysteries }: { mysteries: EntryCard[] }) {
    const { t, url } = useAtlas();
    const titles: Record<string, string> = {
        evidence: `${t('verification.strong_evidence')} / ${t('verification.reported')}`,
        theory: t('verification.theory'),
        noise: `${t('verification.rumor')} / ${t('verification.debunked')}`,
    };
    return (
        <section className="bg-ink text-paper relative overflow-hidden py-16 md:py-20">
            <div
                className="bg-neon/10 pointer-events-none absolute -top-40 left-1/2 size-[60rem] -translate-x-1/2 rounded-full blur-3xl"
                aria-hidden
            />
            <div className={cn(container, 'relative')}>
                <SectionHeading kicker={t('home.mysteries_kicker')} title={t('home.mysteries_title')} intro={t('home.mysteries_intro')} />
                <div className="mt-12 grid gap-6 lg:grid-cols-3">
                    {COLUMNS.map((col) => {
                        const items = mysteries.filter((m) => col.statuses.includes(m.verification));
                        return (
                            <Reveal key={col.key} className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
                                <div className="mb-4 flex items-center justify-between px-2">
                                    <p className="label-caps text-paper/70">{titles[col.key]}</p>
                                    <span className="tabular text-paper/50 text-xs">{items.length}</span>
                                </div>
                                <div className="space-y-3">
                                    {items.map((m) => (
                                        <Card key={m.id} entry={m} variant="case" className="!bg-ink/80 text-paper !border-white/10" />
                                    ))}
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
                <div className="mt-8">
                    <Link href={url('easter-eggs')} className="text-neon inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                        {t('common.view_all')} <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Map preview */

export function MapPreviewSection({ markers }: { markers: MapMarkerData[] }) {
    const { t, url } = useAtlas();
    return (
        <section className="relative py-16 md:py-20">
            <div className={cn(container, 'grid items-center gap-10 lg:grid-cols-12')}>
                <div className="lg:col-span-4">
                    <SectionHeading kicker={t('home.map_kicker')} title={t('home.map_title')} intro={t('home.map_intro')} />
                    <Link
                        href={url('map')}
                        className="bg-neon text-ink hover:bg-paper mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold"
                    >
                        {t('home.map_cta')} <ArrowRight className="size-4" />
                    </Link>
                    <p className="text-subtle mt-4 text-xs">{t('map.schematic_notice')}</p>
                </div>
                <Reveal kind="clipUp" className="lg:col-span-8">
                    <div className="aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-white/10 sm:aspect-[16/11]">
                        <AtlasMap
                            markers={markers}
                            interactive={false}
                            onSelect={(m) => m && router.visit(`${url('map')}?marker=${m.id}`)}
                            labels={{
                                zoomIn: t('map.zoom_in'),
                                zoomOut: t('map.zoom_out'),
                                reset: t('map.reset'),
                                keyboard: t('map.keyboard_hint'),
                                approximate: t('map.approximate'),
                                mapLabel: t('map.title'),
                            }}
                        />
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Guides */

export function GuidesSection({ guides }: { guides: EntryCard[] }) {
    const { t, url } = useAtlas();
    return (
        <section className="border-line border-t py-16 md:py-20">
            <div className={cn(container, 'grid gap-12 lg:grid-cols-12')}>
                <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-28">
                        <SectionHeading kicker={t('home.guides_kicker')} title={t('home.guides_title')} intro={t('home.guides_intro')} />
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={url('missions')}
                                className="border-line hover:border-neon inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold"
                            >
                                {t('nav.missions')}
                            </Link>
                            <Link
                                href={url('world')}
                                className="border-line hover:border-neon inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold"
                            >
                                {t('nav.world')}
                            </Link>
                        </div>
                    </div>
                </div>
                <RevealGroup as="ol" className="divide-line border-line divide-y border-y lg:col-span-8">
                    {guides.map((g, i) => (
                        <RevealItem as="li" key={g.id}>
                            <Link
                                href={g.url}
                                className="group grid grid-cols-[auto_1fr] items-start gap-5 py-6 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-8"
                            >
                                <span className="font-display text-5xl leading-none text-transparent transition-colors [-webkit-text-stroke:1px_var(--color-subtle)] group-hover:[-webkit-text-stroke-color:var(--color-neon)] sm:text-7xl">
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="min-w-0">
                                    <span className="label-caps text-subtle">{metaLine(g, t)}</span>
                                    <span className="group-hover:text-neon mt-1 block text-xl font-semibold text-balance md:text-2xl">{g.title}</span>
                                    {g.summary && <span className="text-subtle mt-2 line-clamp-2 block text-sm leading-relaxed">{g.summary}</span>}
                                </span>
                                <span className="col-start-2 sm:col-start-auto">
                                    <VerificationBadge status={g.verification} size="xs" />
                                </span>
                            </Link>
                        </RevealItem>
                    ))}
                </RevealGroup>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ Updates */

export function UpdatesSection({ updates, trailers }: { updates: EntryCard[]; trailers: EntryCard[] }) {
    const { t, url, date } = useAtlas();
    const videos = trailers.filter((tr) => tr.video).slice(0, 2);
    return (
        <section className="bg-surface/30 py-16 md:py-20">
            <div className={container}>
                <SectionHeading
                    kicker={t('home.updates_kicker')}
                    title={t('home.updates_title')}
                    action={
                        <Link href={url('news')} className="text-neon inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                            {t('common.view_all')} <ArrowRight className="size-4" />
                        </Link>
                    }
                />
                <div className="mt-12 grid gap-12 lg:grid-cols-12">
                    <ol className="border-line relative space-y-1 border-l pl-6 lg:col-span-5">
                        {updates.map((u) => (
                            <Reveal as="li" key={u.id} className="relative">
                                <span className="bg-neon ring-canvas absolute top-4 -left-[1.95rem] size-3 rounded-full ring-4" aria-hidden />
                                <Link href={u.url} className="group hover:bg-surface-2 block rounded-2xl p-3">
                                    <time className="label-caps text-subtle" dateTime={u.event_date ?? undefined}>
                                        {date(u.event_date)}
                                    </time>
                                    <p className="group-hover:text-neon mt-1 font-semibold text-balance">{u.title}</p>
                                    <div className="mt-2">
                                        <VerificationBadge status={u.verification} size="xs" />
                                    </div>
                                </Link>
                            </Reveal>
                        ))}
                    </ol>
                    <div className="space-y-6 lg:col-span-7">
                        <p className="label-caps text-subtle">{t('home.trailers_title')}</p>
                        {videos.map((v) => (
                            <Reveal key={v.id}>
                                <YouTubeEmbed id={v.video!.id} title={v.title} />
                                <Link href={v.url} className="hover:text-neon mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                                    {t('entry.scenes')} <ArrowRight className="size-4" />
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

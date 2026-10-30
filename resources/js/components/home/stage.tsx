import { Countdown } from '@/components/home/cover';
import { VerificationBadge } from '@/components/site/verification-badge';
import { useAtlas } from '@/hooks/use-atlas';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { EntryCard, MediaItem } from '@/types/atlas';
import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';

const wrap = 'safe-px mx-auto max-w-[1440px] lg:px-8';
const focal = (m?: MediaItem | null) => `${m?.focal_x ?? 50}% 30%`;

/* ------------------------------------------------------------------ Hero stage */

/** Opening scene: crossfading official screenshots behind the title, a tilting fan of character cards on the right. */
export function HeroStage({
    scenes,
    characters,
    counts,
}: {
    scenes: MediaItem[];
    characters: EntryCard[];
    counts: { cast: number; regions: number; stills: number };
}) {
    const { t, url, site } = useAtlas();
    const reduced = useReducedMotion();
    const [scene, setScene] = useState(0);
    const [first, ...rest] = site.name.toUpperCase().split(' ');

    useEffect(() => {
        if (reduced || scenes.length < 2) return;
        const id = setInterval(() => setScene((s) => (s + 1) % scenes.length), 7000);
        return () => clearInterval(id);
    }, [reduced, scenes.length]);

    return (
        <section className="bg-night relative isolate min-h-[640px] overflow-hidden lg:h-svh lg:max-h-[1000px]" aria-labelledby="cover-title">
            <div className="absolute inset-0 -z-10" aria-hidden>
                {scenes.map((m, i) => (
                    <img
                        key={m.id}
                        src={m.url ?? ''}
                        alt=""
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'low'}
                        decoding="async"
                        className={cn(
                            'kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms]',
                            i === scene ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                ))}
                <div className="from-night via-night/80 lg:via-night/55 absolute inset-0 bg-gradient-to-r to-transparent" />
                <div className="from-canvas absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t to-transparent" />
                <div className="bg-neon/20 absolute -top-40 -left-40 size-[38rem] rounded-full blur-[120px]" />
                <div className="bg-peach/15 absolute right-0 -bottom-40 size-[30rem] rounded-full blur-[120px]" />
            </div>

            <div className={cn(wrap, 'grid h-full items-center gap-10 pt-24 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 lg:pb-16')}>
                <div className="relative z-10 max-w-xl">
                    <p className="label-caps text-peach">{t('home.hero_kicker')}</p>
                    <h1 id="cover-title" className="font-display text-mega mt-3 leading-[0.84] uppercase drop-shadow-[0_6px_30px_rgba(13,12,26,.6)]">
                        <motion.span
                            className="block"
                            initial={reduced ? false : { opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, ease: ease.cinema }}
                        >
                            {first}
                        </motion.span>
                        {rest.length > 0 && (
                            <motion.span
                                className="vi-text block"
                                initial={reduced ? false : { opacity: 0, y: 28 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.9, ease: ease.cinema, delay: 0.12 }}
                            >
                                {rest.join(' ')}
                            </motion.span>
                        )}
                    </h1>
                    <p className="text-paper/85 mt-5 max-w-md text-[15px] leading-relaxed text-pretty">{t('home.hero_intro')}</p>
                    <div className="mt-7 flex flex-wrap gap-2.5">
                        <Link
                            href={url('map')}
                            className="group vi-gradient text-ink inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold shadow-[0_10px_40px_-10px_rgba(249,118,176,.7)]"
                        >
                            {t('home.cta_explore')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <a
                            href="#chapter-cast"
                            className="border-paper/25 text-paper hover:border-paper/60 inline-flex h-11 items-center rounded-full border bg-white/5 px-5 text-sm font-medium backdrop-blur transition-colors"
                        >
                            {t('home.cta_start')}
                        </a>
                    </div>
                    <div className="border-paper/15 bg-night/45 mt-8 inline-block rounded-2xl border p-4 backdrop-blur-md">
                        <p className="label-caps text-paper/70 mb-2 text-[14px]">{t('home.countdown_label')}</p>
                        <Countdown target={site.release_date} />
                    </div>
                </div>

                <CardFan characters={characters} counts={counts} />
            </div>

            {scenes.length > 1 && (
                <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 lg:left-8 lg:translate-x-0">
                    <div className="flex gap-1.5" role="tablist" aria-label={t('home.scenes')}>
                        {scenes.map((m, i) => (
                            <button
                                key={m.id}
                                type="button"
                                role="tab"
                                aria-selected={i === scene}
                                aria-label={`${t('home.scene')} ${i + 1}`}
                                onClick={() => setScene(i)}
                                className="grid h-6 place-items-center"
                            >
                                <span className={cn('block h-1 rounded-full transition-all', i === scene ? 'bg-paper w-7' : 'bg-paper/35 w-3')} />
                            </button>
                        ))}
                    </div>
                    <span className="text-paper/60 hidden text-[10px] sm:inline">{scenes[scene]?.attribution}</span>
                </div>
            )}
            <ScrollCue />
        </section>
    );
}

function ScrollCue() {
    const { t } = useAtlas();
    const [gone, setGone] = useState(false);
    useEffect(() => {
        const on = () => setGone(window.scrollY > 80);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);
    return (
        <a
            href="#chapter-cast"
            className={cn(
                'text-paper/80 absolute right-8 bottom-5 z-10 hidden items-center gap-2 text-xs transition-opacity lg:flex',
                gone && 'pointer-events-none opacity-0',
            )}
        >
            <span className="scroll-cue" aria-hidden />
            {t('home.scroll_hint')}
        </a>
    );
}

/** Fan of character cards on a spinning ring; the whole fan tilts toward the pointer. */
function CardFan({ characters, counts }: { characters: EntryCard[]; counts: { cast: number; regions: number; stills: number } }) {
    const { t } = useAtlas();
    const reduced = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const withArt = characters.filter((c) => c.hero).slice(0, 5);
    // Lead protagonists sit at the centre of the fan, supporting cast on the wings.
    const cards = withArt.length >= 3 ? [withArt[2], withArt[0], withArt[1], ...withArt.slice(3)] : withArt;
    const mid = (cards.length - 1) / 2;

    const move = (e: ReactPointerEvent) => {
        if (reduced || e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 14 });
    };

    if (!cards.length) return null;
    return (
        <div
            ref={ref}
            onPointerMove={move}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative mx-auto h-[360px] w-full max-w-[560px] [perspective:1600px] sm:h-[440px] lg:h-[560px]"
        >
            <div className="stage-ring absolute top-1/2 left-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2" aria-hidden />
            <div
                className="absolute inset-0 transition-transform duration-500 ease-out [transform-style:preserve-3d]"
                style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            >
                {cards.map((c, i) => {
                    const off = i - mid;
                    return (
                        <motion.div
                            key={c.id}
                            className="absolute top-1/2 left-1/2 w-[30%] max-w-[180px]"
                            style={{ zIndex: 10 - Math.abs(Math.round(off)) }}
                            initial={reduced ? false : { opacity: 0, y: 60, rotate: 0, x: '-50%' }}
                            animate={{ opacity: 1, y: `calc(-50% + ${Math.abs(off) * 18}px)`, x: `calc(-50% + ${off * 74}%)`, rotate: off * 7 }}
                            transition={{ duration: 1, delay: 0.25 + i * 0.08, ease: ease.cinema }}
                        >
                            <Link
                                href={c.url}
                                className="group border-paper/20 bg-night block aspect-[3/4] overflow-hidden rounded-2xl border shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)] transition-transform duration-300 hover:-translate-y-4 hover:scale-[1.04]"
                                aria-label={c.title}
                            >
                                <img
                                    src={c.hero!.thumb ?? c.hero!.url ?? ''}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    style={{ objectPosition: focal(c.hero) }}
                                    loading="eager"
                                />
                                <span className="from-night/90 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                                <span className="holo-sheen absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                {Math.abs(off) < 1.5 && (
                                    <span className="font-display text-paper absolute right-2.5 bottom-2.5 left-2.5 text-[15px] leading-[0.95] uppercase sm:text-lg">
                                        {c.title}
                                    </span>
                                )}
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
            <Chip className="top-[8%] left-[2%]" n={counts.cast} label={t('home.chip_cast')} delay={0} />
            <Chip className="top-[16%] right-[0%]" n={counts.regions} label={t('home.chip_regions')} delay={-2.5} />
            <Chip className="right-[6%] bottom-[6%]" n={counts.stills} label={t('home.chip_stills')} delay={-4} />
        </div>
    );
}

function Chip({ n, label, className, delay }: { n: number; label: string; className: string; delay: number }) {
    const { num } = useAtlas();
    return (
        <span
            className={cn(
                'float-chip border-paper/15 bg-night/70 text-paper absolute z-20 hidden rounded-full border px-3.5 py-1.5 text-xs backdrop-blur-md sm:block',
                className,
            )}
            style={{ animationDelay: `${delay}s` }}
        >
            <b className="text-neon font-bold">{num(n)}</b> {label}
        </span>
    );
}

/* ------------------------------------------------------------------ Chapters */

export function Chapter({
    id,
    no,
    title,
    foil,
    sub,
    children,
    className,
}: {
    id: string;
    no: number;
    title: string;
    foil: string;
    sub?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section id={id} className={cn('relative scroll-mt-16 py-16 md:py-24', className)} aria-labelledby={`${id}-title`}>
            <div className={wrap}>
                <header className="mb-10 max-w-3xl md:mb-12">
                    <p className="text-neon font-mono text-sm tracking-widest">{String(no).padStart(2, '0')}</p>
                    <h2 id={`${id}-title`} className="font-display text-giant mt-2 leading-[0.9] uppercase">
                        {title} <span className="vi-text">{foil}</span>
                    </h2>
                    {sub && <p className="text-subtle mt-4 max-w-xl text-base leading-relaxed text-pretty">{sub}</p>}
                </header>
                {children}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ 01 · Cast (holo cards) */

export function CastDeck({ characters }: { characters: EntryCard[] }) {
    const { t, url } = useAtlas();
    return (
        <>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {characters.map((c, i) => (
                    <HoloCard key={c.id} entry={c} index={i} />
                ))}
            </div>
            <Link href={url('characters')} className="text-neon mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                {t('common.view_all')} <ArrowRight className="size-4" />
            </Link>
        </>
    );
}

function HoloCard({ entry, index }: { entry: EntryCard; index: number }) {
    const { t } = useAtlas();
    const reduced = useReducedMotion();
    const ref = useRef<HTMLAnchorElement>(null);
    const [style, setStyle] = useState<CSSProperties>({});

    const move = (e: ReactPointerEvent) => {
        if (reduced || e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        setStyle({
            transform: `perspective(900px) rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 14}deg) translateY(-4px)`,
            ['--mx' as string]: `${px * 100}%`,
            ['--my' as string]: `${py * 100}%`,
        });
    };

    return (
        <motion.div
            className="w-[70vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none"
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: (index % 4) * 0.07, ease: ease.cinema }}
        >
            <Link
                ref={ref}
                href={entry.url}
                onPointerMove={move}
                onPointerLeave={() => setStyle({})}
                style={style}
                className="holo group border-line bg-surface relative block aspect-[3/4] overflow-hidden rounded-2xl border transition-transform duration-200 ease-out"
            >
                {entry.hero?.url ? (
                    <img
                        src={entry.hero.thumb ?? entry.hero.url}
                        alt={entry.hero.alt ?? ''}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ objectPosition: focal(entry.hero) }}
                    />
                ) : (
                    <span className="vi-gradient block h-full w-full opacity-30" />
                )}
                <span className="from-night via-night/30 absolute inset-0 bg-gradient-to-t to-transparent" />
                <span className="holo-sheen absolute inset-0" />
                <span className="absolute top-3 left-3">
                    <VerificationBadge status={entry.verification} size="xs" className="bg-night/70 backdrop-blur" />
                </span>
                <span className="absolute right-4 bottom-4 left-4">
                    {entry.meta.character_role && (
                        <span className="label-caps text-paper/70 block">{t(`character_role.${entry.meta.character_role}`)}</span>
                    )}
                    <span className="font-display text-paper mt-1 block text-3xl leading-[0.92] uppercase">{entry.title}</span>
                </span>
            </Link>
        </motion.div>
    );
}

/* ------------------------------------------------------------------ 02 · World (scroll-linked story) */

export function WorldStory({ regions, stats }: { regions: EntryCard[]; stats: Record<string, number> }) {
    const { t, url, num } = useAtlas();
    const [active, setActive] = useState(0);
    const blocks = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        const io = new IntersectionObserver(
            (items) => {
                for (const it of items) if (it.isIntersecting) setActive(Number((it.target as HTMLElement).dataset.i));
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        blocks.current.forEach((b) => b && io.observe(b));
        return () => io.disconnect();
    }, [regions.length]);

    return (
        <>
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <ol>
                    {regions.map((r, i) => (
                        <li
                            key={r.id}
                            ref={(el) => {
                                blocks.current[i] = el;
                            }}
                            data-i={i}
                            className="border-line flex flex-col justify-center border-t py-8 lg:min-h-[52vh]"
                        >
                            <div className="mb-5 aspect-[16/10] overflow-hidden rounded-xl lg:hidden">
                                {r.hero?.url && <img src={r.hero.thumb ?? r.hero.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                            </div>
                            <p className={cn('font-mono text-xs transition-colors', active === i ? 'text-neon' : 'text-subtle')}>
                                {String(i + 1).padStart(2, '0')} / {String(regions.length).padStart(2, '0')}
                            </p>
                            <h3
                                className={cn(
                                    'font-display mt-2 text-4xl leading-none uppercase transition-opacity md:text-5xl',
                                    active === i ? 'opacity-100' : 'lg:opacity-40',
                                )}
                            >
                                {r.title}
                            </h3>
                            {r.summary && <p className="text-subtle mt-3 max-w-md text-[15px] leading-relaxed">{r.summary}</p>}
                            <Link href={r.url} className="text-neon mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
                                {t('common.read_more')} <ArrowUpRight className="size-4" />
                            </Link>
                        </li>
                    ))}
                </ol>
                <div className="hidden lg:block">
                    <div className="sticky top-20 h-[calc(100svh-7rem)] max-h-[760px] overflow-hidden rounded-3xl ring-1 ring-white/10">
                        {regions.map((r, i) =>
                            r.hero?.url ? (
                                <img
                                    key={r.id}
                                    src={r.hero.url}
                                    alt={i === active ? (r.hero.alt ?? '') : ''}
                                    loading="lazy"
                                    decoding="async"
                                    className={cn(
                                        'absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms]',
                                        i === active ? 'scale-100 opacity-100' : 'scale-110 opacity-0',
                                    )}
                                />
                            ) : null,
                        )}
                        <div className="from-night/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                        <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4">
                            <p className="font-display text-paper text-6xl leading-none uppercase xl:text-7xl">{regions[active]?.title}</p>
                            <span className="text-paper/60 text-[10px]">{regions[active]?.hero?.attribution}</span>
                        </div>
                    </div>
                </div>
            </div>
            <dl className="border-line mt-12 grid grid-cols-2 border-t md:grid-cols-4">
                {(
                    [
                        ['regions', t('home.chip_regions')],
                        ['markers', t('home.stats_markers')],
                        ['entries', t('home.stats_entries')],
                        ['sources', t('home.stats_sources')],
                    ] as const
                ).map(([k, label]) => (
                    <div key={k} className="border-line border-b p-5 md:border-r md:last:border-r-0">
                        <dt className="label-caps text-subtle">{label}</dt>
                        <dd className="font-display mt-2 text-5xl leading-none tabular-nums">{num(stats[k] ?? 0)}</dd>
                    </div>
                ))}
            </dl>
            <Link href={url('locations')} className="text-neon mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                {t('common.view_all')} <ArrowRight className="size-4" />
            </Link>
        </>
    );
}

/* ------------------------------------------------------------------ 04 · Gallery (drag to explore) */

export function StillsGallery({ screens }: { screens: MediaItem[] }) {
    const { t } = useAtlas();
    const track = useRef<HTMLDivElement>(null);
    const drag = useRef({ down: false, x: 0, left: 0, moved: false });
    const [open, setOpen] = useState<number | null>(null);
    const items = screens.slice(0, 60);

    const down = (e: ReactPointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        drag.current = { down: true, x: e.clientX, left: track.current!.scrollLeft, moved: false };
    };
    const move = (e: ReactPointerEvent) => {
        const d = drag.current;
        if (!d.down) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 5) d.moved = true;
        track.current!.scrollLeft = d.left - dx;
    };
    const up = () => (drag.current.down = false);

    const step = useCallback((dir: number) => setOpen((o) => (o === null ? o : (o + dir + items.length) % items.length)), [items.length]);
    useEffect(() => {
        if (open === null) return;
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(null);
            if (e.key === 'ArrowRight') step(1);
            if (e.key === 'ArrowLeft') step(-1);
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [open, step]);

    const current = open !== null ? items[open] : null;

    return (
        <>
            <p className="text-subtle mb-4 flex items-center gap-2 text-sm">
                <span className="drag-hint" aria-hidden /> {t('home.drag_hint')}
            </p>
            <div
                ref={track}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerLeave={up}
                className="no-scrollbar -mx-4 flex cursor-grab snap-x gap-3 overflow-x-auto px-4 pb-2 select-none active:cursor-grabbing sm:mx-0 sm:px-0"
                tabIndex={0}
                aria-label={t('home.ch_gallery_title')}
            >
                {items.map((m, i) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => !drag.current.moved && setOpen(i)}
                        className={cn(
                            'group relative shrink-0 snap-start overflow-hidden rounded-xl',
                            i % 5 === 0 ? 'h-[300px] w-[420px] sm:h-[380px] sm:w-[540px]' : 'h-[300px] w-[240px] sm:h-[380px] sm:w-[300px]',
                        )}
                        aria-label={`${m.alt ?? ''} ${i + 1}`}
                    >
                        <img
                            src={m.thumb ?? m.url ?? ''}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <span className="bg-night/70 text-paper/80 absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                            {m.attribution}
                        </span>
                    </button>
                ))}
            </div>
            <AnimatePresence>
                {current && (
                    <motion.div
                        className="bg-night/95 fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur"
                        role="dialog"
                        aria-modal="true"
                        aria-label={current.alt ?? ''}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(null)}
                    >
                        <figure className="max-h-full max-w-[1600px]" onClick={(e) => e.stopPropagation()}>
                            <img src={current.url ?? ''} alt={current.alt ?? ''} className="max-h-[82svh] w-auto rounded-xl" />
                            <figcaption className="text-paper/70 mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <span>
                                    {current.title} · {current.attribution}
                                </span>
                                <span className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => step(-1)}
                                        className="border-paper/20 hover:border-paper/60 rounded-full border px-3 py-1.5"
                                    >
                                        ←
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => step(1)}
                                        className="border-paper/20 hover:border-paper/60 rounded-full border px-3 py-1.5"
                                    >
                                        →
                                    </button>
                                </span>
                            </figcaption>
                        </figure>
                        <button
                            type="button"
                            onClick={() => setOpen(null)}
                            className="text-paper absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10"
                            aria-label={t('common.close')}
                        >
                            <X className="size-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

import { AtlasMap } from '@/components/map/atlas-map';
import { EntryCard } from '@/components/site/entry-card';
import { FavoriteButton, ProgressToggle } from '@/components/site/favorite-button';
import { MediaFrame } from '@/components/site/media-frame';
import { Prose } from '@/components/site/prose';
import { Reveal, RevealGroup, RevealItem } from '@/components/site/reveal';
import { StatBar } from '@/components/site/stat-bar';
import { VerificationBadge } from '@/components/site/verification-badge';
import { YouTubeEmbed } from '@/components/site/youtube-embed';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { hostname } from '@/lib/atlas';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { AtlasShared, EntryFull, MapMarkerData } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowUpRight, Check, ChevronRight, ExternalLink, Eye, Languages, Link2, MapPin, PenLine } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface Props extends AtlasShared {
    entry: EntryFull;
    sectionKey: string;
    breadcrumbs: { title: string; href: string }[];
    preview?: boolean;
}

type Scene = { scene: string; note: string; verification: string };
type Claim = { text: string; verification: string };

const LIST_FIELDS = ['known', 'highlights', 'key_facts', 'objectives', 'steps', 'how_to_check'] as const;
const TEXT_FIELDS = [
    'story_role',
    'evidence',
    'unknowns',
    'habitat',
    'behavior',
    'details',
    'discovery',
    'acquisition',
    'customization',
    'attachments',
    'rewards',
    'prerequisites',
    'analogue_note',
] as const;

export default function EntryPage() {
    const { entry, breadcrumbs, preview } = usePage<Props>().props;
    const { t, locales, locale, date, url } = useAtlas();
    const reduced = useReducedMotion();
    const heroRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
    const [revealed, setRevealed] = useState(entry.spoiler_level !== 'major');

    const video = entry.gallery.find((g) => g.role === 'video' && g.embed_provider === 'youtube');
    const images = entry.gallery.filter((g) => g.kind === 'image');
    const fields = entry.fields ?? {};
    const sourceLocale = locales.find((l) => l.code === entry.locale)?.native ?? entry.locale;
    const currentLocale = locales.find((l) => l.code === locale)?.native ?? locale;
    const relatedGroups = Object.entries(entry.related);
    const watchUrl = typeof fields.watch_url === 'string' && fields.watch_url.startsWith('https://') ? fields.watch_url : null;

    const markerData: MapMarkerData[] = entry.markers.map((m) => ({
        ...m,
        precision: m.precision as 'approximate' | 'confirmed',
        basis: null,
        zoom: 3,
        entry,
    }));

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success(t('entry.copied'));
        } catch {
            toast.error(t('common.error'));
        }
    };

    return (
        <SiteLayout overlayHeader>
            <article lang={entry.locale}>
                <header ref={heroRef} className="bg-ink text-paper relative isolate flex min-h-[60svh] items-end overflow-hidden md:min-h-[66svh]">
                    <motion.div className="absolute inset-0 -z-10" style={reduced ? undefined : { y: heroY }}>
                        <motion.div
                            className="h-full w-full"
                            initial={reduced ? false : { scale: 1.12, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.6, ease: ease.cinema }}
                        >
                            <MediaFrame
                                media={entry.hero}
                                still={entry.still}
                                art={entry.art}
                                type={entry.type}
                                label={entry.title}
                                className="h-full w-full"
                                priority
                            />
                        </motion.div>
                    </motion.div>
                    <div className="from-ink via-ink/55 to-ink/10 absolute inset-0 -z-10 bg-gradient-to-t" />
                    <div className="safe-px mx-auto w-full max-w-[1600px] pt-32 pb-12 lg:px-8 lg:pb-16">
                        {breadcrumbs.length > 0 && (
                            <nav aria-label="Breadcrumb" className="mb-6">
                                <ol className="text-paper/70 flex flex-wrap items-center gap-1 text-xs">
                                    {breadcrumbs.slice(0, -1).map((b) => (
                                        <li key={b.href} className="flex items-center gap-1">
                                            <Link href={b.href} className="hover:text-paper">
                                                {b.title}
                                            </Link>
                                            <ChevronRight className="size-3" aria-hidden />
                                        </li>
                                    ))}
                                    <li aria-current="page" className="text-paper truncate">
                                        {entry.title}
                                    </li>
                                </ol>
                            </nav>
                        )}
                        <motion.div
                            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: ease.cinema, delay: 0.2 }}
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className="label-caps bg-paper/10 rounded-full px-2.5 py-1 backdrop-blur">{t(`types.${entry.type}`)}</span>
                                <VerificationBadge status={entry.verification} size="md" className="bg-ink/60 backdrop-blur" withDescription />
                                {entry.spoiler_level !== 'none' && (
                                    <span className="label-caps bg-sunset/20 text-sunset inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                                        <AlertTriangle className="size-3" /> {t(`spoiler.${entry.spoiler_level}`)}
                                    </span>
                                )}
                            </div>
                            <h1 className="font-display text-giant max-w-5xl leading-[0.88] text-balance break-words uppercase">{entry.title}</h1>
                            {entry.aliases.length > 0 && (
                                <p className="text-paper/60 mt-3 text-sm">
                                    {t('entry.aliases')}: {entry.aliases.join(' · ')}
                                </p>
                            )}
                            {entry.summary && (
                                <p className="text-paper/85 mt-5 max-w-2xl text-lg leading-relaxed text-pretty md:text-xl">{entry.summary}</p>
                            )}
                            <div className="mt-8 flex flex-wrap items-center gap-2">
                                <FavoriteButton entryId={entry.id} variant="pill" className="border-paper/25 text-paper" />
                                {entry.trackable && <ProgressToggle entryId={entry.id} className="border-paper/25 text-paper" />}
                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="border-paper/25 hover:border-paper inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium"
                                >
                                    <Link2 className="size-4" /> {t('entry.share')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </header>

                <div className="safe-px mx-auto max-w-[1600px] py-12 lg:px-8 lg:py-20">
                    <div className="space-y-3">
                        {preview && (
                            <Notice tone="sunset" icon={<Eye className="size-4" />}>
                                {t('entry.preview_banner')}
                            </Notice>
                        )}
                        {entry.fallback && (
                            <Notice tone="electric" icon={<Languages className="size-4" />}>
                                {t('entry.fallback_notice', { language: currentLocale, source: sourceLocale })}
                            </Notice>
                        )}
                        {!entry.fallback && entry.is_machine && !entry.translation_reviewed && (
                            <Notice tone="violet" icon={<Languages className="size-4" />}>
                                {t('entry.machine_notice')}
                            </Notice>
                        )}
                    </div>

                    <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
                        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
                            <div className="relative">
                                {!revealed && (
                                    <div className="bg-canvas/70 absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center backdrop-blur-xl">
                                        <AlertTriangle className="text-sunset size-8" />
                                        <p className="max-w-sm font-semibold">
                                            {t('spoiler.warning', { level: t(`spoiler.${entry.spoiler_level}`).toLowerCase() })}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRevealed(true)}
                                            className="bg-sunset text-ink min-h-11 rounded-full px-5 text-sm font-semibold"
                                        >
                                            {t('spoiler.reveal')}
                                        </button>
                                    </div>
                                )}
                                <div className={cn(!revealed && 'pointer-events-none blur-md select-none')} aria-hidden={!revealed}>
                                    {video?.embed_id && (
                                        <Reveal className="mb-12">
                                            <YouTubeEmbed id={video.embed_id} title={video.title ?? entry.title} />
                                            {video.attribution && <p className="text-subtle mt-2 text-xs">© {video.attribution} · YouTube</p>}
                                        </Reveal>
                                    )}
                                    {watchUrl && !video && (
                                        <a
                                            href={watchUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-neon text-ink mb-10 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
                                        >
                                            {t('entry.watch_on_rockstar')} <ExternalLink className="size-4" />
                                        </a>
                                    )}

                                    <SectionLabel>{t('entry.overview')}</SectionLabel>
                                    <Prose body={entry.body} lead />

                                    {Array.isArray(fields.scenes) && (fields.scenes as Scene[]).length > 0 && (
                                        <Block title={t('entry.scenes')}>
                                            <ol className="divide-line border-line divide-y overflow-hidden rounded-2xl border">
                                                {(fields.scenes as Scene[]).map((s, i) => (
                                                    <li key={i} className="grid gap-2 p-4 sm:grid-cols-[3rem_1fr_auto] sm:items-start sm:gap-4">
                                                        <span className="font-display text-neon text-2xl">{String(i + 1).padStart(2, '0')}</span>
                                                        <div>
                                                            <p className="font-semibold">{s.scene}</p>
                                                            <p className="text-subtle mt-1 text-sm leading-relaxed">{s.note}</p>
                                                        </div>
                                                        <VerificationBadge status={s.verification} size="xs" />
                                                    </li>
                                                ))}
                                            </ol>
                                        </Block>
                                    )}

                                    {LIST_FIELDS.filter((k) => Array.isArray(fields[k]) && (fields[k] as unknown[]).length > 0).map((k) => (
                                        <Block key={k} title={t(`entry.${k === 'known' ? 'known_facts' : k}`)}>
                                            <ul className="space-y-3">
                                                {(fields[k] as string[]).map((item, i) => (
                                                    <li key={i} className="flex gap-3">
                                                        <Check className="text-mint mt-1 size-4 shrink-0" aria-hidden />
                                                        <span className="leading-relaxed">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Block>
                                    ))}

                                    {TEXT_FIELDS.filter((k) => typeof fields[k] === 'string' && fields[k]).length > 0 && (
                                        <dl className="mt-12 grid gap-6 sm:grid-cols-2">
                                            {TEXT_FIELDS.filter((k) => typeof fields[k] === 'string' && fields[k]).map((k) => (
                                                <div key={k} className="border-line rounded-2xl border p-5">
                                                    <dt className="label-caps text-subtle">{t(`entry.${k === 'analogue_note' ? 'analogue' : k}`)}</dt>
                                                    <dd className="mt-2 leading-relaxed">{fields[k] as string}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    )}

                                    {Array.isArray(fields.analysis) && (fields.analysis as Claim[]).length > 0 && (
                                        <Block title={t('entry.analysis')}>
                                            <ul className="space-y-3">
                                                {(fields.analysis as Claim[]).map((a, i) => (
                                                    <li key={i} className="border-line rounded-2xl border border-dashed p-4">
                                                        <VerificationBadge status={a.verification} size="xs" />
                                                        <p className="mt-2 leading-relaxed">{a.text}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Block>
                                    )}

                                    {images.length > 0 && (
                                        <Block title={t('entry.gallery')}>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                {images.map((m) => (
                                                    <figure key={m.id}>
                                                        <MediaFrame media={m} className="aspect-video rounded-2xl" />
                                                        <figcaption className="text-subtle mt-2 text-xs">
                                                            {m.caption}
                                                            {m.attribution && <> · © {m.attribution}</>}
                                                        </figcaption>
                                                    </figure>
                                                ))}
                                            </div>
                                        </Block>
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="space-y-8 lg:col-span-5 xl:col-span-4">
                            <div className="space-y-8 lg:sticky lg:top-28">
                                <SpecsPanel entry={entry} />

                                {markerData.length > 0 && (
                                    <div>
                                        <SectionLabel>{t('entry.on_map')}</SectionLabel>
                                        <Link
                                            href={`${url('map')}?marker=${markerData[0].id}`}
                                            className="group ring-line block overflow-hidden rounded-2xl ring-1"
                                        >
                                            <div className="pointer-events-none aspect-[4/3]">
                                                <AtlasMap
                                                    markers={markerData}
                                                    interactive={false}
                                                    labels={{
                                                        zoomIn: '',
                                                        zoomOut: '',
                                                        reset: '',
                                                        keyboard: '',
                                                        approximate: t('map.approximate'),
                                                        mapLabel: t('entry.on_map'),
                                                    }}
                                                />
                                            </div>
                                            <span className="bg-surface group-hover:text-neon flex min-h-11 items-center justify-between gap-2 px-4 text-sm font-semibold">
                                                <span className="inline-flex items-center gap-2">
                                                    <MapPin className="size-4" /> {t('entry.open_on_map')}
                                                </span>
                                                <span className="text-subtle text-xs font-normal">
                                                    {markerData[0].precision === 'approximate' ? t('map.approximate') : t('map.confirmed')}
                                                </span>
                                            </span>
                                        </Link>
                                    </div>
                                )}

                                <div>
                                    <SectionLabel>{t('entry.sources')}</SectionLabel>
                                    {entry.sources.length === 0 ? (
                                        <p className="text-subtle text-sm">{t('entry.no_sources')}</p>
                                    ) : (
                                        <ol className="space-y-3">
                                            {entry.sources.map((s, i) => (
                                                <li key={i} className="border-line rounded-2xl border p-4">
                                                    <a
                                                        href={s.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer nofollow"
                                                        className="group flex items-start justify-between gap-3"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="label-caps text-subtle">
                                                                {t(`entry.source_type.${s.type}`)} · {s.publisher ?? hostname(s.url)}
                                                            </span>
                                                            <span className="group-hover:text-neon mt-1 block font-semibold break-words">
                                                                {s.title}
                                                            </span>
                                                        </span>
                                                        <ArrowUpRight
                                                            className="text-subtle group-hover:text-neon mt-1 size-4 shrink-0"
                                                            aria-hidden
                                                        />
                                                    </a>
                                                    {s.note && <p className="text-subtle mt-2 text-sm leading-relaxed">{s.note}</p>}
                                                    <p className="text-subtle mt-2 text-xs">
                                                        {s.published_on && (
                                                            <>
                                                                {t('entry.published')}: {date(s.published_on, 'short')} ·{' '}
                                                            </>
                                                        )}
                                                        {s.accessed_on && (
                                                            <>
                                                                {t('entry.accessed')}: {date(s.accessed_on, 'short')}
                                                            </>
                                                        )}
                                                    </p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>

                                {entry.verification_history.length > 0 && (
                                    <div>
                                        <SectionLabel>{t('entry.verification_history')}</SectionLabel>
                                        <ol className="border-line space-y-3 border-l pl-4">
                                            {entry.verification_history.map((v, i) => (
                                                <li key={i} className="relative text-sm">
                                                    <span className="bg-neon absolute top-1.5 -left-[1.3rem] size-2 rounded-full" aria-hidden />
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {v.from && (
                                                            <>
                                                                <VerificationBadge status={v.from} size="xs" /> →
                                                            </>
                                                        )}
                                                        <VerificationBadge status={v.to} size="xs" />
                                                    </div>
                                                    {v.note && <p className="text-subtle mt-1">{v.note}</p>}
                                                    <p className="text-subtle mt-0.5 text-xs">{date(v.date, 'short')}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                <div className="border-line text-subtle space-y-1 border-t pt-6 text-xs">
                                    {entry.last_verified_at && (
                                        <p>
                                            {t('entry.last_verified')}: {date(entry.last_verified_at)}
                                        </p>
                                    )}
                                    {entry.updated_at && (
                                        <p>
                                            {t('entry.updated')}: {date(entry.updated_at)}
                                        </p>
                                    )}
                                    <Link
                                        href={`${url('contribute')}?entry=${entry.id}`}
                                        className="text-neon mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
                                    >
                                        <PenLine className="size-4" /> {t('entry.report_issue')}
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {relatedGroups.length > 0 && (
                        <section className="border-line mt-20 border-t pt-14" aria-labelledby="related-title">
                            <h2 id="related-title" className="font-display text-huge leading-none uppercase">
                                {t('entry.related')}
                            </h2>
                            <div className="mt-10 space-y-12">
                                {relatedGroups.map(([section, items]) => (
                                    <div key={section}>
                                        <div className="mb-4 flex items-baseline justify-between gap-4">
                                            <h3 className="label-caps text-neon">{t(`nav.${section}`)}</h3>
                                            <Link href={url(section as never)} className="text-subtle hover:text-text text-xs">
                                                {t('common.view_all')}
                                            </Link>
                                        </div>
                                        <RevealGroup className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {items.map((r) => (
                                                <RevealItem key={r.id} className="min-w-0">
                                                    <EntryCard entry={r} variant="row" />
                                                    {r.relation && r.relation !== 'related' && (
                                                        <p className="text-subtle -mt-1 pl-24 text-xs sm:pl-28">
                                                            {t(`relation.${r.relation}`)}
                                                            {r.relation_note ? ` · ${r.relation_note}` : ''}
                                                        </p>
                                                    )}
                                                </RevealItem>
                                            ))}
                                        </RevealGroup>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </article>
        </SiteLayout>
    );
}

function SpecsPanel({ entry }: { entry: EntryFull }) {
    const { t, date } = useAtlas();
    const specs = entry.specs ?? {};
    const attrs = entry.attributes ?? {};
    const rows: { label: string; value: ReactNode }[] = [];
    const push = (label: string, value: ReactNode) => value !== null && value !== undefined && value !== '' && rows.push({ label, value });

    if (entry.type === 'vehicle') {
        push(t('specs.manufacturer'), specs.manufacturer as string);
        push(t('specs.model'), specs.model as string);
        push(t('specs.vehicle_class'), specs.vehicle_class ? t(`vehicle_class.${specs.vehicle_class}`) : null);
        if (specs.real_world_inspiration)
            push(
                t('specs.real_world_inspiration'),
                <span className="flex flex-wrap items-center justify-end gap-2">
                    {specs.real_world_inspiration as string}
                    {specs.inspiration_verification && <VerificationBadge status={specs.inspiration_verification as string} size="xs" />}
                </span>,
            );
        push(t('specs.first_seen'), specs.first_seen as string);
    } else if (entry.type === 'character') {
        push(t('specs.full_name'), specs.full_name as string);
        push(t('specs.role'), specs.role ? t(`character_role.${specs.role}`) : null);
        push(t('specs.affiliation'), specs.affiliation as string);
        if (specs.voice_actor)
            push(
                t('specs.voice_actor'),
                <span className="flex flex-wrap items-center justify-end gap-2">
                    {specs.voice_actor as string}
                    {specs.voice_actor_verification && <VerificationBadge status={specs.voice_actor_verification as string} size="xs" />}
                </span>,
            );
        push(t('specs.first_seen'), specs.first_seen as string);
    } else if (entry.type === 'weapon') {
        push(t('specs.weapon_class'), specs.weapon_class as string);
        push(t('specs.first_seen'), specs.first_seen as string);
    } else if (entry.type === 'mission') {
        push(t('specs.mission_type'), specs.mission_type ? t(`mission_type.${specs.mission_type}`) : null);
    }
    if (typeof attrs.real_world_analogue === 'string')
        push(
            t('entry.analogue'),
            <span className="flex flex-wrap items-center justify-end gap-2">
                {attrs.real_world_analogue}
                {typeof attrs.analogue_verification === 'string' && <VerificationBadge status={attrs.analogue_verification} size="xs" />}
            </span>,
        );
    if (typeof attrs.music === 'string') push(t('entry.music'), attrs.music);
    if (typeof attrs.duration === 'string') push(t('entry.duration'), attrs.duration);
    if (entry.event_date && (entry.type === 'trailer' || entry.type === 'news')) push(t('entry.released_on'), date(entry.event_date));
    if (entry.region)
        push(
            t('entry.region'),
            <Link href={entry.region.url} className="text-neon hover:underline">
                {entry.region.title}
            </Link>,
        );
    if (entry.category) push(t('entry.category'), entry.category.name);
    push(t('confidence.label'), t(`confidence.${entry.confidence}`));

    const stats =
        entry.type === 'vehicle'
            ? (['top_speed', 'acceleration', 'braking', 'handling', 'durability'] as const)
            : entry.type === 'weapon'
              ? (['damage', 'fire_rate', 'range', 'accuracy'] as const)
              : [];

    return (
        <div className="border-line bg-surface/50 rounded-3xl border p-6">
            <SectionLabel>{t('entry.at_a_glance')}</SectionLabel>
            <dl className="divide-line divide-y">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-start justify-between gap-4 py-3 text-sm">
                        <dt className="text-subtle shrink-0">{r.label}</dt>
                        <dd className="text-right font-medium">{r.value}</dd>
                    </div>
                ))}
            </dl>
            {stats.length > 0 && (
                <div className="border-line mt-5 space-y-4 border-t pt-5">
                    {stats.map((s) => (
                        <StatBar key={s} label={t(`specs.${s}`)} value={specs[s] as number | null} unknownLabel={t('compare.stat_unknown')} />
                    ))}
                    {stats.every((s) => specs[s] === null || specs[s] === undefined) && (
                        <p className="text-subtle text-xs leading-relaxed">{t('entry.stats_unknown_note')}</p>
                    )}
                </div>
            )}
            {entry.tags.length > 0 && (
                <div className="border-line mt-5 flex flex-wrap gap-1.5 border-t pt-5">
                    {entry.tags.map((tag) => (
                        <span key={tag.key} className="bg-surface-2 text-subtle rounded-full px-2.5 py-1 text-xs">
                            #{tag.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionLabel({ children }: { children: ReactNode }) {
    return <h2 className="label-caps text-subtle mb-4">{children}</h2>;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Reveal as="section" className="mt-12">
            <h2 className="font-display mb-5 text-3xl uppercase">{title}</h2>
            {children}
        </Reveal>
    );
}

function Notice({ tone, icon, children }: { tone: 'electric' | 'violet' | 'sunset'; icon: ReactNode; children: ReactNode }) {
    const tones = {
        electric: 'border-electric/30 bg-electric/10 text-electric',
        violet: 'border-violet/30 bg-violet/10 text-violet',
        sunset: 'border-sunset/30 bg-sunset/10 text-sunset',
    };
    return (
        <div role="note" className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', tones[tone])}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            <p className="text-text/90">{children}</p>
        </div>
    );
}

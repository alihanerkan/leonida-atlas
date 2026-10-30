import { cn } from '@/lib/utils';
import type { EntryCard as Card } from '@/types/atlas';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FavoriteButton } from './favorite-button';
import { MediaFrame } from './media-frame';
import { VerificationBadge } from './verification-badge';

type Variant = 'poster' | 'landscape' | 'row' | 'case';

export function EntryCard({
    entry,
    variant = 'landscape',
    className,
    priority = false,
    showFavorite = true,
}: {
    entry: Card;
    variant?: Variant;
    className?: string;
    priority?: boolean;
    showFavorite?: boolean;
}) {
    const { t } = useTranslation();
    const meta = metaLine(entry, t);

    if (variant === 'row') {
        return (
            <Link
                href={entry.url}
                className={cn('group hover:bg-surface-2 flex items-center gap-4 rounded-2xl p-2 pr-4 transition-colors', className)}
                prefetch
            >
                <MediaFrame
                    media={entry.hero}
                    still={entry.still}
                    art={entry.art}
                    type={entry.type}
                    label={entry.title}
                    className="size-16 shrink-0 rounded-xl sm:size-20"
                    imgClassName="transition-transform duration-700 group-hover:scale-110"
                />
                <div className="min-w-0 flex-1">
                    <p className="label-caps text-subtle truncate">{meta}</p>
                    <p className="group-hover:text-neon truncate text-base font-semibold">{entry.title}</p>
                    <VerificationBadge status={entry.verification} size="xs" className="mt-1" />
                </div>
                <ArrowUpRight
                    className="text-subtle group-hover:text-neon size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                />
            </Link>
        );
    }

    if (variant === 'case') {
        return (
            <Link
                href={entry.url}
                className={cn(
                    'group border-line bg-surface hover:border-neon/60 relative block overflow-hidden rounded-2xl border p-5 transition-colors',
                    className,
                )}
                prefetch
            >
                <div className="relative flex items-start justify-between gap-3">
                    <span className="label-caps text-subtle font-mono">#{String(entry.id).padStart(4, '0')}</span>
                    <VerificationBadge status={entry.verification} size="xs" />
                </div>
                <h3 className="font-display group-hover:text-neon relative mt-6 text-2xl leading-none uppercase">{entry.title}</h3>
                {entry.summary && <p className="text-subtle relative mt-3 line-clamp-3 text-sm leading-relaxed">{entry.summary}</p>}
                <span className="text-neon relative mt-5 inline-flex items-center gap-1 text-xs font-semibold">
                    {t('common.read_more')} <ArrowUpRight className="size-3.5" />
                </span>
            </Link>
        );
    }

    const isPoster = variant === 'poster';
    return (
        <article className={cn('group relative', className)}>
            <Link href={entry.url} className="block" prefetch aria-label={entry.title}>
                <div className={cn('relative overflow-hidden rounded-2xl ring-1 ring-white/5', isPoster ? 'aspect-[3/4]' : 'aspect-[16/10]')}>
                    <MediaFrame
                        media={entry.hero}
                        still={entry.still}
                        art={entry.art}
                        type={entry.type}
                        label={entry.title}
                        className="absolute inset-0"
                        priority={priority}
                        imgClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
                    />
                    <div
                        className={cn(
                            'absolute inset-0',
                            isPoster ? 'from-ink via-ink/20 bg-gradient-to-t to-transparent' : 'from-ink/70 bg-gradient-to-t to-transparent',
                        )}
                    />
                    <div className="absolute top-3 left-3">
                        <VerificationBadge status={entry.verification} size="xs" className="bg-ink/70 backdrop-blur" />
                    </div>
                    {isPoster && (
                        <div className="absolute right-4 bottom-4 left-4">
                            <p className="label-caps text-paper/70">{meta}</p>
                            <h3 className="font-display text-paper mt-1 text-3xl leading-[0.95] uppercase md:text-4xl">{entry.title}</h3>
                        </div>
                    )}
                </div>
                {!isPoster && (
                    <div className="mt-4 space-y-1.5 pr-10">
                        <p className="label-caps text-subtle">{meta}</p>
                        <h3 className="group-hover:text-neon text-lg leading-snug font-semibold text-balance">{entry.title}</h3>
                        {entry.summary && <p className="text-subtle line-clamp-2 text-sm leading-relaxed">{entry.summary}</p>}
                    </div>
                )}
            </Link>
            {showFavorite && <FavoriteButton entryId={entry.id} className={cn('absolute top-2 right-2', !isPoster && 'opacity-90')} />}
        </article>
    );
}

export function metaLine(entry: Card, t: (k: string) => string): string {
    const parts: string[] = [];
    if (entry.meta.manufacturer) parts.push(entry.meta.manufacturer);
    if (entry.meta.vehicle_class) parts.push(t(`vehicle_class.${entry.meta.vehicle_class}`));
    else if (entry.meta.character_role) parts.push(t(`character_role.${entry.meta.character_role}`));
    else if (entry.meta.mission_type) parts.push(t(`mission_type.${entry.meta.mission_type}`));
    else if (entry.category) parts.push(entry.category.name);
    else parts.push(t(`types.${entry.type}`));
    if (entry.region) parts.push(entry.region.title);
    return parts.join(' · ');
}

import { useTracking } from '@/hooks/use-tracking';
import { cn } from '@/lib/utils';
import { Check, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function FavoriteButton({ entryId, className, variant = 'icon' }: { entryId: number; className?: string; variant?: 'icon' | 'pill' }) {
    const { t } = useTranslation();
    const { favorites, toggleFavorite } = useTracking();
    const active = favorites.has(entryId);
    const label = active ? t('favorite.remove') : t('favorite.add');
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void toggleFavorite(entryId);
            }}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
                'touch-target inline-flex items-center justify-center gap-2 rounded-full transition-colors',
                variant === 'icon'
                    ? 'bg-ink/60 text-paper hover:bg-ink/90 size-11 backdrop-blur'
                    : 'border-line hover:border-neon border px-4 text-sm font-medium',
                active && 'text-neon',
                className,
            )}
        >
            <motion.span
                key={String(active)}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
                <Heart className={cn('size-5', active && 'fill-current')} />
            </motion.span>
            {variant === 'pill' && <span>{label}</span>}
        </button>
    );
}

export function ProgressToggle({ entryId, className, compact = false }: { entryId: number; className?: string; compact?: boolean }) {
    const { t } = useTranslation();
    const { progress, toggleProgress } = useTracking();
    const done = progress.has(entryId);
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void toggleProgress(entryId);
            }}
            aria-pressed={done}
            className={cn(
                'touch-target inline-flex items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors',
                compact ? 'size-11' : 'px-4',
                done ? 'border-mint bg-mint/15 text-mint' : 'border-line hover:border-mint',
                className,
            )}
            aria-label={done ? t('tracker.done') : t('tracker.mark_done')}
        >
            <Check className="size-4" />
            {!compact && <span>{done ? t('tracker.done') : t('tracker.mark_done')}</span>}
        </button>
    );
}

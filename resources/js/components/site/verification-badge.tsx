import { VERIFICATION_TONE } from '@/lib/atlas';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function VerificationBadge({
    status,
    className,
    size = 'sm',
    withDescription = false,
}: {
    status: string;
    className?: string;
    size?: 'xs' | 'sm' | 'md';
    withDescription?: boolean;
}) {
    const { t } = useTranslation();
    const tone = VERIFICATION_TONE[status] ?? VERIFICATION_TONE.unknown;
    const label = t(`verification.${status}`);
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase ring-1 ring-inset',
                tone.ring,
                tone.bg,
                tone.text,
                size === 'xs' && 'px-2 py-0.5 text-[9px]',
                size === 'sm' && 'px-2.5 py-1 text-[10px]',
                size === 'md' && 'px-3 py-1.5 text-xs',
                status === 'debunked' && 'line-through decoration-2',
                className,
            )}
            title={t(`verification_desc.${status}`)}
        >
            <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden />
            {label}
            {withDescription && <span className="sr-only">: {t(`verification_desc.${status}`)}</span>}
        </span>
    );
}

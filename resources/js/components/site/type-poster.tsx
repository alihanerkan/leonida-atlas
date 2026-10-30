import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * Restrained stand-in shown until official artwork is attached: deep indigo, the title as a faint
 * typographic watermark and a thin VI-gradient rule. Deliberately no illustration.
 */
export function TypePoster({ title, type, className }: { title: string; type?: string; className?: string }) {
    const { t } = useTranslation();
    return (
        <div className={cn('[container-type:size] relative h-full w-full overflow-hidden bg-[#1a1930]', className)} aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_100%,rgba(249,118,176,0.16),transparent_60%)]" />
            <p
                className="font-display text-paper/[0.07] absolute right-[3cqw] -bottom-[0.1em] left-[4cqw] leading-[0.82] break-words uppercase"
                style={{ fontSize: `min(${title.length > 14 ? 17 : 24}cqw, 58cqh)` }}
            >
                {title}
            </p>
            {type && (
                <p className="label-caps text-paper/45 absolute top-[6cqh] left-[5cqw] text-[clamp(0.8rem,4cqw,1.2rem)]">{t(`types.${type}`)}</p>
            )}
            <div className="vi-gradient absolute inset-x-0 bottom-0 h-[3px]" />
        </div>
    );
}

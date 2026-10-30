import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'motion/react';

/** A 0–100 performance bar. Null renders an explicit "unknown" state instead of a guess. */
export function StatBar({
    label,
    value,
    unknownLabel,
    color = 'bg-neon',
}: {
    label: string;
    value: number | null | undefined;
    unknownLabel: string;
    color?: string;
}) {
    const reduced = useReducedMotion();
    const known = typeof value === 'number';
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-subtle">{label}</span>
                <span className={cn('tabular font-semibold', !known && 'text-subtle text-xs font-medium italic')}>
                    {known ? value : unknownLabel}
                </span>
            </div>
            <div className="bg-line relative h-1.5 overflow-hidden rounded-full">
                {known ? (
                    <motion.div
                        className={cn('absolute inset-y-0 left-0 rounded-full', color)}
                        initial={{ width: reduced ? `${value}%` : 0 }}
                        whileInView={{ width: `${value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_6px,rgba(255,255,255,0.08)_6px_12px)]" />
                )}
            </div>
        </div>
    );
}

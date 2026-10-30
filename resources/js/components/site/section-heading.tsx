import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Reveal } from './reveal';

export function SectionHeading({
    kicker,
    title,
    intro,
    align = 'left',
    className,
    action,
    as: Tag = 'h2',
}: {
    kicker?: string;
    title: string;
    intro?: string;
    align?: 'left' | 'center';
    className?: string;
    action?: ReactNode;
    as?: 'h1' | 'h2';
}) {
    return (
        <Reveal
            className={cn(
                'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
                align === 'center' && 'items-center text-center md:flex-col md:items-center',
                className,
            )}
        >
            <div className={cn('max-w-3xl', align === 'center' && 'mx-auto')}>
                {kicker && <p className="label-caps text-neon mb-3">{kicker}</p>}
                <Tag className="font-display text-huge leading-[0.92] text-balance uppercase">{title}</Tag>
                {intro && <p className="text-subtle mt-4 max-w-2xl text-base leading-relaxed text-pretty md:text-lg">{intro}</p>}
            </div>
            {action}
        </Reveal>
    );
}

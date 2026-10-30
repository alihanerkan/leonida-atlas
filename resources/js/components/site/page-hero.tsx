import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Reveal } from './reveal';

/** Shared editorial header for index and utility pages: kicker, oversized title, intro, and a thin VI-gradient rule. */
export function PageHero({
    kicker,
    title,
    intro,
    children,
    compact = false,
}: {
    kicker?: string;
    title: string;
    intro?: string;
    art?: string;
    children?: ReactNode;
    compact?: boolean;
}) {
    return (
        <section className={cn('border-line relative overflow-hidden border-b', compact ? 'pt-24 pb-8 md:pt-28' : 'pt-24 pb-10 md:pt-28 md:pb-12')}>
            <div className="vi-gradient absolute inset-x-0 top-0 h-1" aria-hidden />
            <div className="safe-px relative mx-auto max-w-[1600px] lg:px-8">
                <Reveal>
                    {kicker && <p className="label-caps text-neon mb-4">{kicker}</p>}
                    <h1 className="font-display text-giant max-w-5xl leading-[0.9] text-balance break-words uppercase">{title}</h1>
                    {intro && <p className="text-subtle mt-6 max-w-2xl text-lg leading-relaxed text-pretty">{intro}</p>}
                </Reveal>
                {children && <div className="mt-8">{children}</div>}
            </div>
        </section>
    );
}

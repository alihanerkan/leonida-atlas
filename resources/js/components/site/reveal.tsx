import { reducedVariants, variants, viewportOnce } from '@/lib/motion';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

type Kind = 'fadeUp' | 'fade' | 'clipUp' | 'clipLeft';

/** Scroll-triggered entrance used across the site; falls back to a plain fade with reduced motion. */
export function Reveal({
    children,
    className,
    kind = 'fadeUp',
    delay = 0,
    as = 'div',
}: {
    children: ReactNode;
    className?: string;
    kind?: Kind;
    delay?: number;
    as?: 'div' | 'section' | 'li' | 'article';
}) {
    const reduced = useReducedMotion();
    const v = (reduced ? reducedVariants : variants[kind]) as Variants;
    const Comp = motion[as];
    return (
        <Comp className={className} initial="hidden" whileInView="show" viewport={viewportOnce} variants={v} transition={{ delay }}>
            {children}
        </Comp>
    );
}

export function RevealGroup({
    children,
    className,
    gap = 0.08,
    as = 'div',
}: {
    children: ReactNode;
    className?: string;
    gap?: number;
    as?: 'div' | 'ul' | 'ol';
}) {
    const Comp = motion[as];
    return (
        <Comp className={className} initial="hidden" whileInView="show" viewport={viewportOnce} variants={variants.container(gap)}>
            {children}
        </Comp>
    );
}

export function RevealItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'article' }) {
    const reduced = useReducedMotion();
    const Comp = motion[as];
    return (
        <Comp className={className} variants={reduced ? reducedVariants : variants.fadeUp}>
            {children}
        </Comp>
    );
}

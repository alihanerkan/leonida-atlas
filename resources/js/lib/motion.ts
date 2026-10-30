import type { Transition, Variants } from 'motion/react';

/** Central animation vocabulary. Components import from here instead of inventing timings. */
export const ease = {
    cinema: [0.16, 1, 0.3, 1] as const,
    snap: [0.65, 0, 0.35, 1] as const,
    soft: [0.25, 0.1, 0.25, 1] as const,
};

export const duration = { fast: 0.25, base: 0.5, slow: 0.9, epic: 1.4 };

export const stagger = { tight: 0.035, base: 0.08, loose: 0.14 };

export const transition = {
    base: { duration: duration.base, ease: ease.cinema } satisfies Transition,
    slow: { duration: duration.slow, ease: ease.cinema } satisfies Transition,
    spring: { type: 'spring', stiffness: 260, damping: 30 } satisfies Transition,
    panel: { type: 'spring', stiffness: 320, damping: 34 } satisfies Transition,
};

export const variants = {
    fadeUp: {
        hidden: { opacity: 0, y: 28 },
        show: { opacity: 1, y: 0, transition: transition.slow },
    } satisfies Variants,
    fade: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: transition.base },
    } satisfies Variants,
    clipUp: {
        hidden: { clipPath: 'inset(100% 0% 0% 0%)' },
        show: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: duration.epic, ease: ease.cinema } },
    } satisfies Variants,
    clipLeft: {
        hidden: { clipPath: 'inset(0% 100% 0% 0%)' },
        show: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: duration.epic, ease: ease.cinema } },
    } satisfies Variants,
    letter: {
        hidden: { y: '110%' },
        show: { y: '0%', transition: { duration: duration.slow, ease: ease.cinema } },
    } satisfies Variants,
    container: (gap: number = stagger.base, delay = 0): Variants => ({
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
    }),
};

/** Reduced-motion counterparts: opacity only, no movement or clipping. */
export const reducedVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2 } },
};

export const viewportOnce = { once: true, margin: '0px 0px -12% 0px' } as const;

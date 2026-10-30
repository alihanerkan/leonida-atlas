import { cn } from '@/lib/utils';

/** Typographic monogram on the VI sunset ramp. */
export function BrandMark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'vi-gradient font-display text-ink inline-flex size-8 shrink-0 items-center justify-center rounded-[6px] text-[15px] leading-none',
                className,
            )}
            aria-hidden
        >
            LA
        </span>
    );
}

export function BrandWordmark({ name, className }: { name: string; className?: string }) {
    const [first, ...rest] = name.split(' ');
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <BrandMark />
            <span className="font-display text-xl leading-none tracking-wide uppercase">
                {first}
                {rest.length > 0 && <span className="vi-text"> {rest.join(' ')}</span>}
            </span>
        </span>
    );
}

import { parseBody } from '@/lib/atlas';
import { cn } from '@/lib/utils';

/** Renders editorial text as plain React nodes (never as HTML), so stored content cannot inject markup. */
export function Prose({ body, className, lead = false }: { body: string | null | undefined; className?: string; lead?: boolean }) {
    const blocks = parseBody(body);
    return (
        <div className={cn('text-text/90 space-y-5 text-[1.0625rem] leading-[1.75] text-pretty', className)}>
            {blocks.map((b, i) => {
                if (b.kind === 'h')
                    return (
                        <h3 key={i} className="font-display text-text pt-4 text-2xl tracking-wide uppercase">
                            {b.text}
                        </h3>
                    );
                if (b.kind === 'ul')
                    return (
                        <ul key={i} className="space-y-2 pl-5">
                            {b.items.map((item, k) => (
                                <li key={k} className="marker:text-neon list-disc">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    );
                return (
                    <p key={i} className={cn(lead && i === 0 && 'text-text text-xl leading-relaxed md:text-2xl')}>
                        {b.text}
                    </p>
                );
            })}
        </div>
    );
}

import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'border-line flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed px-6 py-16 text-center',
                className,
            )}
        >
            <Compass className="text-neon size-10" aria-hidden />
            <p className="font-display max-w-md text-2xl uppercase">{title}</p>
            {body && <p className="text-subtle max-w-lg">{body}</p>}
            {action}
        </div>
    );
}

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import type { AtlasShared } from '@/types/atlas';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'sonner';

export function AdminLayout({
    title,
    description,
    actions,
    breadcrumbs = [],
    children,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}) {
    const { props } = usePage<AtlasShared>();
    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.flash?.error) toast.error(props.flash.error);
    }, [props.flash]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${title} — ${props.site?.name ?? 'Leonida Atlas'} CMS`}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="font-display text-3xl leading-none tracking-wide uppercase md:text-4xl">{title}</h1>
                        {description && <p className="text-muted-foreground mt-2 max-w-3xl text-sm">{description}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                </div>
                {children}
            </div>
            <Toaster theme="dark" position="bottom-right" />
        </AppLayout>
    );
}

export function Panel({
    title,
    description,
    children,
    className,
    actions,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
    actions?: ReactNode;
}) {
    return (
        <section className={cn('bg-card rounded-xl border p-4 md:p-5', className)}>
            {(title || actions) && (
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        {title && <h2 className="text-sm font-semibold">{title}</h2>}
                        {description && <p className="text-muted-foreground mt-1 text-xs">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

const inputClass =
    'w-full min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export function Field({
    label,
    error,
    help,
    children,
    className,
    required,
}: {
    label: string;
    error?: string;
    help?: string;
    children: (id: string) => ReactNode;
    className?: string;
    required?: boolean;
}) {
    const id = useId();
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={id} className="block text-sm font-medium">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children(id)}
            {help && <p className="text-muted-foreground text-xs">{help}</p>}
            <InputError message={error} />
        </div>
    );
}

export function TextInput({
    label,
    value,
    onChange,
    error,
    help,
    type = 'text',
    required,
    className,
    ...rest
}: {
    label: string;
    value: string | number | null | undefined;
    onChange: (v: string) => void;
    error?: string;
    help?: string;
    type?: string;
    required?: boolean;
    className?: string;
    placeholder?: string;
    maxLength?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
}) {
    return (
        <Field label={label} error={error} help={help} required={required} className={className}>
            {(id) => (
                <input
                    id={id}
                    type={type}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                    aria-invalid={!!error}
                    required={required}
                    {...rest}
                />
            )}
        </Field>
    );
}

export function TextArea({
    label,
    value,
    onChange,
    error,
    help,
    rows = 4,
    className,
    mono,
    maxLength,
}: {
    label: string;
    value: string | null | undefined;
    onChange: (v: string) => void;
    error?: string;
    help?: string;
    rows?: number;
    className?: string;
    mono?: boolean;
    maxLength?: number;
}) {
    return (
        <Field label={label} error={error} help={help} className={className}>
            {(id) => (
                <textarea
                    id={id}
                    rows={rows}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(inputClass, mono && 'font-mono text-xs')}
                    aria-invalid={!!error}
                    maxLength={maxLength}
                />
            )}
        </Field>
    );
}

export function SelectInput({
    label,
    value,
    onChange,
    options,
    error,
    help,
    className,
    allowEmpty,
    disabled,
}: {
    label: string;
    value: string | number | null | undefined;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    error?: string;
    help?: string;
    className?: string;
    allowEmpty?: string;
    disabled?: boolean;
}) {
    return (
        <Field label={label} error={error} help={help} className={className}>
            {(id) => (
                <select
                    id={id}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                    aria-invalid={!!error}
                    disabled={disabled}
                >
                    {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            )}
        </Field>
    );
}

export function Toggle({
    label,
    checked,
    onChange,
    help,
    disabled,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    help?: string;
    disabled?: boolean;
}) {
    return (
        <label className={cn('flex min-h-10 cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
                <span className="text-sm font-medium">{label}</span>
                {help && <span className="text-muted-foreground block text-xs">{help}</span>}
            </span>
        </label>
    );
}

const STATUS_TONE: Record<string, string> = {
    published: 'bg-emerald-500/15 text-emerald-400',
    accepted: 'bg-emerald-500/15 text-emerald-400',
    draft: 'bg-zinc-500/20 text-zinc-300',
    pending: 'bg-amber-500/15 text-amber-400',
    review: 'bg-amber-500/15 text-amber-400',
    archived: 'bg-zinc-700/40 text-zinc-400',
    rejected: 'bg-red-500/15 text-red-400',
    trashed: 'bg-red-500/15 text-red-400',
    machine: 'bg-violet-500/15 text-violet-300',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
    const { t } = useTranslation('admin');
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                STATUS_TONE[status] ?? 'bg-muted text-muted-foreground',
                className,
            )}
        >
            {t(`status.${status}`)}
        </span>
    );
}

/** One dot per locale: filled when published, outlined when draft/review, empty when missing. */
export function LocaleDots({
    cells,
    locales,
    hrefFor,
}: {
    cells: Record<string, { status: string; machine?: boolean } | string | null>;
    locales: string[];
    hrefFor?: (l: string) => string;
}) {
    return (
        <div className="flex flex-wrap gap-1">
            {locales.map((l) => {
                const cell = cells[l];
                const status = typeof cell === 'string' ? cell : cell?.status;
                const machine = typeof cell === 'object' && cell?.machine;
                const cls = cn(
                    'inline-flex h-6 min-w-8 items-center justify-center rounded px-1 text-[10px] font-bold uppercase',
                    !status && 'border-muted-foreground/40 text-muted-foreground/60 border border-dashed',
                    status === 'published' && (machine ? 'bg-violet-500/25 text-violet-200' : 'bg-emerald-500/25 text-emerald-300'),
                    (status === 'draft' || status === 'review') && 'border border-amber-500/60 text-amber-300',
                );
                const label = `${l}: ${status ?? 'missing'}${machine ? ' (machine)' : ''}`;
                return hrefFor ? (
                    <Link key={l} href={hrefFor(l)} className={cn(cls, 'hover:ring-ring hover:ring-2')} title={label} aria-label={label}>
                        {l === 'zh-CN' ? 'zh' : l}
                    </Link>
                ) : (
                    <span key={l} className={cls} title={label} aria-label={label}>
                        {l === 'zh-CN' ? 'zh' : l}
                    </span>
                );
            })}
        </div>
    );
}

export function Pagination({ pagination, only }: { pagination: { current: number; last: number; total: number }; only?: string[] }) {
    const { t } = useTranslation('admin');
    if (pagination.last <= 1) return <p className="text-muted-foreground text-xs">{t('common.page_of', pagination)}</p>;
    const go = (page: number) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));
        router.get(url.pathname + url.search, {}, { preserveScroll: true, preserveState: true, only });
    };
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">{t('common.page_of', pagination)}</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.current <= 1} onClick={() => go(pagination.current - 1)}>
                    <ChevronLeft className="size-4" /> {t('common.prev')}
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.current >= pagination.last} onClick={() => go(pagination.current + 1)}>
                    {t('common.next')} <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

export function ConfirmButton({
    children,
    message,
    onConfirm,
    variant = 'destructive',
    size = 'sm',
    disabled,
}: {
    children: ReactNode;
    message: string;
    onConfirm: () => void;
    variant?: 'destructive' | 'outline' | 'default' | 'ghost';
    size?: 'sm' | 'default' | 'icon';
    disabled?: boolean;
}) {
    const { t } = useTranslation('admin');
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} disabled={disabled}>
                {children}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogTitle>{t('common.confirm')}</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant={variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={() => {
                                setOpen(false);
                                onConfirm();
                            }}
                        >
                            {t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('overflow-x-auto rounded-xl border', className)}>
            <table className="w-full min-w-[720px] text-sm">{children}</table>
        </div>
    );
}

export function Th({
    children,
    className,
    sort,
    current,
    dir,
    onSort,
}: {
    children?: ReactNode;
    className?: string;
    sort?: string;
    current?: string;
    dir?: string;
    onSort?: (s: string) => void;
}) {
    const active = sort && current === sort;
    return (
        <th
            scope="col"
            className={cn(
                'bg-muted/40 text-muted-foreground border-b px-3 py-2.5 text-left text-xs font-semibold tracking-wide uppercase',
                className,
            )}
            aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
        >
            {sort && onSort ? (
                <button type="button" onClick={() => onSort(sort)} className="hover:text-foreground inline-flex items-center gap-1">
                    {children} {active && (dir === 'asc' ? '↑' : '↓')}
                </button>
            ) : (
                children
            )}
        </th>
    );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
    return <td className={cn('border-b px-3 py-2.5 align-middle', className)}>{children}</td>;
}

export function relativeTime(iso: string | null | undefined, locale: string): string {
    if (!iso) return '—';
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const steps: [number, Intl.RelativeTimeFormatUnit][] = [
        [60, 'second'],
        [3600, 'minute'],
        [86400, 'hour'],
        [604800, 'day'],
        [2629800, 'week'],
        [31557600, 'month'],
    ];
    for (let i = 0; i < steps.length; i++) {
        const [limit] = steps[i];
        if (Math.abs(diff) < limit) {
            const div = i === 0 ? 1 : steps[i - 1][0];
            return rtf.format(Math.round(diff / div), steps[i][1]);
        }
    }
    return rtf.format(Math.round(diff / 31557600), 'year');
}

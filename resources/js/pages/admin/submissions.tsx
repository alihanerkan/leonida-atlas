import { AdminLayout, Pagination, Panel, StatusPill, TextArea, Toggle, relativeTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AtlasShared } from '@/types/atlas';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Item {
    id: number;
    kind: string;
    entry_type: string | null;
    locale: string;
    title: string;
    body: string;
    source_url: string | null;
    status: string;
    user: string | null;
    entry: { id: number; title: string } | null;
    reviewer: string | null;
    review_note: string | null;
    created_at: string;
}

interface Props extends AtlasShared {
    items: Item[];
    pagination: { current: number; last: number; total: number };
    status: string;
    counts: Record<string, number>;
}

export default function Submissions() {
    const { items, pagination, status, counts, locale } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    return (
        <AdminLayout
            title={t('submissions.title')}
            description={t('submissions.subtitle')}
            breadcrumbs={[{ title: t('nav.submissions'), href: '/admin/submissions' }]}
        >
            <div role="tablist" className="flex gap-2">
                {['pending', 'accepted', 'rejected'].map((s) => (
                    <button
                        key={s}
                        role="tab"
                        aria-selected={status === s}
                        type="button"
                        onClick={() => router.get('/admin/submissions', { status: s })}
                        className={cn(
                            'min-h-10 rounded-full border px-4 text-sm',
                            status === s ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground',
                        )}
                    >
                        {t(`status.${s}`)} · {counts[s] ?? 0}
                    </button>
                ))}
            </div>
            {items.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">{t('common.empty')}</p>
            ) : (
                items.map((s) => <SubmissionCard key={s.id} item={s} locale={locale} />)
            )}
            <Pagination pagination={pagination} />
        </AdminLayout>
    );
}

function SubmissionCard({ item, locale }: { item: Item; locale: string }) {
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const form = useForm({ decision: 'accept', note: '', create_draft: item.kind === 'new' && !!item.entry_type });
    const review = (decision: 'accept' | 'reject') => {
        form.transform((d) => ({ ...d, decision }));
        form.post(`/admin/submissions/${item.id}/review`, { preserveScroll: true });
    };
    return (
        <Panel
            title={item.title}
            description={`${t(`submissions.kind.${item.kind}`)}${item.entry_type ? ` · ${tm(`types.${item.entry_type}`)}` : ''} · ${item.locale.toUpperCase()} · ${t('submissions.submitted_by', { name: item.user ?? '—' })} · ${relativeTime(item.created_at, locale)}`}
            actions={<StatusPill status={item.status} />}
        >
            {item.entry && (
                <p className="mb-2 text-sm">
                    {t('submissions.about_entry', { title: '' })}
                    <Link href={`/admin/entries/${item.entry.id}`} className="text-primary">
                        {item.entry.title}
                    </Link>
                </p>
            )}
            <p className="text-sm whitespace-pre-wrap">{item.body}</p>
            {item.source_url && (
                <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-primary mt-2 inline-flex items-center gap-1 text-sm break-all"
                >
                    {item.source_url} <ExternalLink className="size-3.5" />
                </a>
            )}
            {item.status === 'pending' ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                    <TextArea label={t('submissions.review_note')} value={form.data.note} onChange={(v) => form.setData('note', v)} rows={2} />
                    {item.kind === 'new' && item.entry_type && (
                        <Toggle
                            label={t('submissions.create_draft')}
                            checked={form.data.create_draft}
                            onChange={(v) => form.setData('create_draft', v)}
                        />
                    )}
                    <div className="flex gap-2">
                        <Button onClick={() => review('accept')} disabled={form.processing}>
                            {t('submissions.accept')}
                        </Button>
                        <Button variant="outline" onClick={() => review('reject')} disabled={form.processing}>
                            {t('submissions.reject')}
                        </Button>
                    </div>
                </div>
            ) : (
                item.review_note && (
                    <p className="text-muted-foreground mt-3 border-t pt-3 text-sm">
                        {item.reviewer}: {item.review_note}
                    </p>
                )
            )}
        </Panel>
    );
}

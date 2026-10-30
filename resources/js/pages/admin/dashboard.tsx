import { AdminLayout, Panel, StatusPill, relativeTime } from '@/components/admin/ui';
import { VerificationBadge } from '@/components/site/verification-badge';
import { Button } from '@/components/ui/button';
import { VERIFICATION_ORDER } from '@/lib/atlas';
import type { AtlasShared } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { Languages, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props extends AtlasShared {
    metrics: Record<string, number>;
    byType: Record<string, number>;
    byVerification: Record<string, number>;
    translations: { locale: string; translated: number; missing: number; unreviewed_machine: number }[];
    recent: { id: number; title: string; type: string; status: string; editor: string | null; updated_at: string }[];
    activity: { id: number; action: string; label: string | null; user: string | null; date: string }[];
}

export default function Dashboard() {
    const { metrics, byType, byVerification, translations, recent, activity, locale, auth } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const can = (p: string) => auth.user?.permissions.includes(p);
    const maxType = Math.max(1, ...Object.values(byType));
    const total = Math.max(1, metrics.total);

    const cards = [
        ['total', metrics.total, '/admin/entries'],
        ['published', metrics.published, '/admin/entries?status=published'],
        ['drafts', metrics.drafts, '/admin/entries?status=draft'],
        ['review', metrics.review, '/admin/entries?status=review'],
        ['awaiting', metrics.awaiting_verification, '/admin/entries?verification=unverified'],
        ['submissions', metrics.pending_submissions, '/admin/submissions'],
    ] as const;

    return (
        <AdminLayout
            title={t('dashboard.title')}
            description={t('dashboard.subtitle')}
            actions={
                <>
                    {can('content.create') && (
                        <Button asChild>
                            <Link href="/admin/entries/create?type=location">
                                <Plus className="size-4" /> {t('dashboard.new_entry')}
                            </Link>
                        </Button>
                    )}
                    {can('translations.edit') && (
                        <Button asChild variant="outline">
                            <Link href="/admin/translations">
                                <Languages className="size-4" /> {t('dashboard.open_translations')}
                            </Link>
                        </Button>
                    )}
                </>
            }
        >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {cards.map(([key, value, href]) => (
                    <Link key={key} href={href} className="bg-card hover:border-primary rounded-xl border p-4 transition-colors">
                        <p className="text-muted-foreground text-xs">{t(`dashboard.${key}`)}</p>
                        <p className="font-display mt-2 text-4xl tabular-nums">{value}</p>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Panel title={t('dashboard.by_type')}>
                    {Object.keys(byType).length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('common.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(byType).map(([type, count]) => (
                                <li key={type}>
                                    <Link href={`/admin/entries?type=${type}`} className="group block">
                                        <div className="flex justify-between text-sm">
                                            <span className="group-hover:text-primary">{tm(`types.${type}`)}</span>
                                            <span className="text-muted-foreground tabular-nums">{count}</span>
                                        </div>
                                        <div className="bg-muted mt-1 h-1.5 rounded-full">
                                            <div className="bg-primary h-full rounded-full" style={{ width: `${(count / maxType) * 100}%` }} />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
                <Panel title={t('dashboard.by_verification')}>
                    <ul className="space-y-2.5">
                        {VERIFICATION_ORDER.filter((v) => byVerification[v]).map((v) => (
                            <li key={v} className="flex items-center justify-between gap-3">
                                <Link href={`/admin/entries?verification=${v}`}>
                                    <VerificationBadge status={v} size="xs" />
                                </Link>
                                <span className="text-muted-foreground text-sm tabular-nums">
                                    {byVerification[v]} · {Math.round((byVerification[v] / total) * 100)}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
                <Panel title={t('dashboard.translations')}>
                    <ul className="space-y-2.5">
                        {translations.map((tr) => (
                            <li key={tr.locale}>
                                <Link href={`/admin/translations?locale=${tr.locale}&state=missing`} className="group block">
                                    <div className="flex justify-between gap-2 text-sm">
                                        <span className="group-hover:text-primary font-semibold uppercase">{tr.locale}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {tr.translated} {t('dashboard.translated')} · {tr.missing} {t('dashboard.missing')}
                                            {tr.unreviewed_machine > 0 && ` · ${tr.unreviewed_machine} ${t('dashboard.unreviewed')}`}
                                        </span>
                                    </div>
                                    <div className="bg-muted mt-1 flex h-1.5 overflow-hidden rounded-full">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${((tr.translated - tr.unreviewed_machine) / total) * 100}%` }}
                                        />
                                        <div className="h-full bg-violet-500" style={{ width: `${(tr.unreviewed_machine / total) * 100}%` }} />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Panel title={t('dashboard.recent')}>
                    <ul className="divide-y">
                        {recent.map((r) => (
                            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                                <Link href={`/admin/entries/${r.id}`} className="hover:text-primary min-w-0">
                                    <span className="block truncate text-sm font-medium">{r.title}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {tm(`types.${r.type}`)} · {relativeTime(r.updated_at, locale)}
                                        {r.editor && ` · ${r.editor}`}
                                    </span>
                                </Link>
                                <StatusPill status={r.status} />
                            </li>
                        ))}
                    </ul>
                </Panel>
                {can('audit.view') && (
                    <Panel
                        title={t('dashboard.activity')}
                        actions={
                            <Link href="/admin/audit" className="text-primary text-xs">
                                {t('nav.audit')}
                            </Link>
                        }
                    >
                        {activity.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{t('dashboard.no_activity')}</p>
                        ) : (
                            <ul className="divide-y">
                                {activity.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                        <span className="min-w-0 truncate">
                                            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{a.action}</code> {a.label}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 text-xs">
                                            {a.user ?? '—'} · {relativeTime(a.date, locale)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                )}
            </div>
        </AdminLayout>
    );
}

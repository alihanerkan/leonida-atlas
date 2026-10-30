import { AdminLayout, DataTable, Pagination, Td, Th } from '@/components/admin/ui';
import type { AtlasShared } from '@/types/atlas';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface Props extends AtlasShared {
    events: {
        id: number;
        action: string;
        subject_type: string | null;
        subject_id: number | null;
        label: string | null;
        meta: Record<string, unknown> | null;
        user: string | null;
        ip: string | null;
        date: string;
    }[];
    pagination: { current: number; last: number; total: number };
    filters: { action: string };
    actions: string[];
}

export default function Audit() {
    const { events, pagination, filters, actions, locales, locale } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const intl = locales.find((l) => l.code === locale)?.intl ?? 'en-US';
    const fmt = new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short' });
    return (
        <AdminLayout title={t('audit.title')} description={t('audit.subtitle')} breadcrumbs={[{ title: t('nav.audit'), href: '/admin/audit' }]}>
            <select
                aria-label={t('audit.action')}
                value={filters.action}
                onChange={(e) => router.get('/admin/audit', e.target.value ? { action: e.target.value } : {})}
                className="bg-background min-h-10 max-w-xs rounded-md border px-3 text-sm"
            >
                <option value="">
                    {t('audit.action')}: {t('common.all')}
                </option>
                {actions.map((a) => (
                    <option key={a} value={a}>
                        {a}
                    </option>
                ))}
            </select>
            <DataTable>
                <thead>
                    <tr>
                        <Th>{t('common.date')}</Th>
                        <Th>{t('common.user')}</Th>
                        <Th>{t('audit.action')}</Th>
                        <Th>{t('audit.subject')}</Th>
                        <Th>{t('audit.details')}</Th>
                        <Th>{t('audit.ip')}</Th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((a) => (
                        <tr key={a.id}>
                            <Td className="text-xs whitespace-nowrap">{fmt.format(new Date(a.date))}</Td>
                            <Td>{a.user ?? '—'}</Td>
                            <Td>
                                <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{a.action}</code>
                            </Td>
                            <Td className="text-sm">
                                {a.label}
                                {a.subject_type && (
                                    <span className="text-muted-foreground block text-xs">
                                        {a.subject_type} #{a.subject_id}
                                    </span>
                                )}
                            </Td>
                            <Td className="text-muted-foreground max-w-xs truncate font-mono text-[11px]">{a.meta ? JSON.stringify(a.meta) : ''}</Td>
                            <Td className="text-muted-foreground text-xs">{a.ip}</Td>
                        </tr>
                    ))}
                </tbody>
            </DataTable>
            <Pagination pagination={pagination} />
        </AdminLayout>
    );
}

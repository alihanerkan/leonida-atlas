import { AdminLayout, DataTable, LocaleDots, Pagination, Panel, StatusPill, Td, Th } from '@/components/admin/ui';
import type { AtlasShared } from '@/types/atlas';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface Props extends AtlasShared {
    rows: { id: number; type: string; title: string; status: string; cells: Record<string, { status: string; machine: boolean } | null> }[];
    pagination: { current: number; last: number; total: number };
    filters: Record<string, string | undefined>;
    totals: Record<string, number>;
    entryCount: number;
    types: string[];
}

export default function TranslationsIndex() {
    const { rows, pagination, filters, totals, entryCount, types, locales, auth } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const codes = locales.map((l) => l.code);
    const allowed = auth.user?.role === 'translator' ? new Set(auth.user.translator_locales ?? []) : null;
    const apply = (patch: Record<string, string | undefined>) =>
        router.get(
            '/admin/translations',
            Object.fromEntries(Object.entries({ ...filters, ...patch }).filter(([, v]) => v)) as Record<string, string>,
            { preserveState: true },
        );

    return (
        <AdminLayout
            title={t('translations.title')}
            description={t('translations.subtitle')}
            breadcrumbs={[{ title: t('nav.translations'), href: '/admin/translations' }]}
        >
            <Panel title={t('translations.coverage')}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {locales.map((l) => {
                        const pct = entryCount ? Math.round(((totals[l.code] ?? 0) / entryCount) * 100) : 0;
                        return (
                            <button
                                key={l.code}
                                type="button"
                                onClick={() => apply({ locale: l.code, state: 'missing' })}
                                className="hover:border-primary rounded-lg border p-3 text-left"
                            >
                                <p className="text-muted-foreground text-xs">{l.native}</p>
                                <p className="font-display mt-1 text-2xl tabular-nums">{pct}%</p>
                                <div className="bg-muted mt-2 h-1 rounded-full">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-muted-foreground mt-1 text-[11px]">
                                    {totals[l.code] ?? 0}/{entryCount}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </Panel>
            <div className="flex flex-wrap gap-2">
                <select
                    aria-label={t('translations.filter_locale')}
                    value={filters.locale ?? ''}
                    onChange={(e) => apply({ locale: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('translations.filter_locale')}: {t('common.all')}
                    </option>
                    {locales.map((l) => (
                        <option key={l.code} value={l.code}>
                            {l.native}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t('translations.filter_state')}
                    value={filters.state ?? ''}
                    onChange={(e) => apply({ state: e.target.value || undefined })}
                    disabled={!filters.locale}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                >
                    <option value="">
                        {t('translations.filter_state')}: {t('common.all')}
                    </option>
                    {['missing', 'draft', 'review', 'published', 'machine'].map((s) => (
                        <option key={s} value={s}>
                            {t(`status.${s}`)}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t('common.type')}
                    value={filters.type ?? ''}
                    onChange={(e) => apply({ type: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('common.type')}: {t('common.all')}
                    </option>
                    {types.map((ty) => (
                        <option key={ty} value={ty}>
                            {tm(`types.${ty}`)}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t('common.status')}
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('common.status')}: {t('common.all')}
                    </option>
                    {['draft', 'review', 'published', 'archived'].map((s) => (
                        <option key={s} value={s}>
                            {t(`status.${s}`)}
                        </option>
                    ))}
                </select>
            </div>
            <DataTable>
                <thead>
                    <tr>
                        <Th>{t('common.title')}</Th>
                        <Th>{t('common.status')}</Th>
                        <Th>{t('entries.languages')}</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-muted-foreground py-10 text-center">
                                {t('common.empty')}
                            </td>
                        </tr>
                    )}
                    {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                            <Td>
                                <Link href={`/admin/entries/${r.id}`} className="hover:text-primary font-medium">
                                    {r.title}
                                </Link>
                                <div className="text-muted-foreground text-xs">{tm(`types.${r.type}`)}</div>
                            </Td>
                            <Td>
                                <StatusPill status={r.status} />
                            </Td>
                            <Td>
                                <LocaleDots
                                    cells={r.cells}
                                    locales={codes}
                                    hrefFor={(l) => (allowed && !allowed.has(l) ? `/admin/entries/${r.id}` : `/admin/translations/${r.id}/${l}`)}
                                />
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </DataTable>
            <Pagination pagination={pagination} />
        </AdminLayout>
    );
}

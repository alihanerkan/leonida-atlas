import { AdminLayout, ConfirmButton, DataTable, LocaleDots, Pagination, StatusPill, Td, Th, relativeTime } from '@/components/admin/ui';
import { VerificationBadge } from '@/components/site/verification-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { VERIFICATION_ORDER } from '@/lib/atlas';
import type { AtlasShared } from '@/types/atlas';
import { Link, router, usePage } from '@inertiajs/react';
import { Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Row {
    id: number;
    key: string;
    type: string;
    title: string;
    status: string;
    verification: string;
    featured: boolean;
    updated_at: string;
    editor: string | null;
    deleted_at: string | null;
    locales: Record<string, string | null>;
}

interface Props extends AtlasShared {
    entries: Row[];
    pagination: { current: number; last: number; total: number; per_page: number };
    filters: Record<string, string | undefined>;
    types: string[];
}

export default function EntriesIndex() {
    const { entries, pagination, filters, types, locale, auth } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const can = (p: string) => auth.user?.permissions.includes(p);
    const [q, setQ] = useState(filters.q ?? '');
    const [selected, setSelected] = useState<number[]>([]);
    const locales = Object.keys(entries[0]?.locales ?? { en: null, tr: null, es: null, 'zh-CN': null, it: null, fr: null, ru: null });
    const trash = filters.status === 'trashed';

    const apply = (patch: Record<string, string | undefined>) => {
        const next = Object.fromEntries(Object.entries({ ...filters, ...patch }).filter(([, v]) => v));
        router.get('/admin/entries', next as Record<string, string>, { preserveState: true, preserveScroll: true });
        setSelected([]);
    };

    useEffect(() => {
        const id = setTimeout(() => q !== (filters.q ?? '') && apply({ q: q || undefined }), 350);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const sort = (s: string) => apply({ sort: s, dir: filters.sort === s && filters.dir !== 'desc' ? 'desc' : 'asc' });
    const bulk = (action: string) =>
        router.post('/admin/entries/bulk', { ids: selected, action }, { preserveScroll: true, onSuccess: () => setSelected([]) });
    const allSelected = entries.length > 0 && selected.length === entries.length;

    return (
        <AdminLayout
            title={t('entries.title')}
            description={t('entries.subtitle')}
            breadcrumbs={[{ title: t('nav.entries'), href: '/admin/entries' }]}
            actions={
                can('content.create') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <Plus className="size-4" /> {t('entries.new')}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {types.map((ty) => (
                                <DropdownMenuItem key={ty} asChild>
                                    <Link href={`/admin/entries/create?type=${ty}`}>{tm(`types.${ty}`)}</Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t('common.search')}
                        aria-label={t('common.search')}
                        className="bg-background min-h-10 w-full rounded-md border pr-3 pl-9 text-sm"
                    />
                </div>
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
                    {['draft', 'review', 'published', 'archived', 'trashed'].map((s) => (
                        <option key={s} value={s}>
                            {t(`status.${s}`)}
                        </option>
                    ))}
                </select>
                <select
                    aria-label={t('entries.verification')}
                    value={filters.verification ?? ''}
                    onChange={(e) => apply({ verification: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('entries.verification')}: {t('common.all')}
                    </option>
                    {VERIFICATION_ORDER.map((v) => (
                        <option key={v} value={v}>
                            {tm(`verification.${v}`)}
                        </option>
                    ))}
                </select>
            </div>

            {selected.length > 0 && (
                <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-2 rounded-xl border p-3">
                    <span className="text-sm font-medium">{t('common.selected', { count: selected.length })}</span>
                    {trash
                        ? can('content.delete') && (
                              <Button size="sm" variant="outline" onClick={() => bulk('restore')}>
                                  {t('entries.bulk_restore')}
                              </Button>
                          )
                        : can('content.publish') && (
                              <>
                                  <Button size="sm" onClick={() => bulk('publish')}>
                                      {t('entries.bulk_publish')}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => bulk('unpublish')}>
                                      {t('entries.bulk_unpublish')}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => bulk('archive')}>
                                      {t('entries.bulk_archive')}
                                  </Button>
                              </>
                          )}
                    {!trash && can('content.delete') && (
                        <ConfirmButton
                            message={t('entries.confirm_bulk', { action: t('entries.bulk_delete'), count: selected.length })}
                            onConfirm={() => bulk('delete')}
                        >
                            {t('entries.bulk_delete')}
                        </ConfirmButton>
                    )}
                </div>
            )}

            <DataTable>
                <thead>
                    <tr>
                        <Th className="w-10">
                            <input
                                type="checkbox"
                                aria-label="Select all"
                                checked={allSelected}
                                onChange={() => setSelected(allSelected ? [] : entries.map((e) => e.id))}
                            />
                        </Th>
                        <Th sort="title" current={filters.sort} dir={filters.dir} onSort={sort}>
                            {t('common.title')}
                        </Th>
                        <Th sort="type" current={filters.sort} dir={filters.dir} onSort={sort}>
                            {t('common.type')}
                        </Th>
                        <Th sort="status" current={filters.sort} dir={filters.dir} onSort={sort}>
                            {t('common.status')}
                        </Th>
                        <Th sort="verification" current={filters.sort} dir={filters.dir} onSort={sort}>
                            {t('entries.verification')}
                        </Th>
                        <Th>{t('entries.languages')}</Th>
                        <Th sort="updated_at" current={filters.sort ?? 'updated_at'} dir={filters.dir ?? 'desc'} onSort={sort}>
                            {t('common.updated')}
                        </Th>
                    </tr>
                </thead>
                <tbody>
                    {entries.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-muted-foreground py-10 text-center">
                                {t('common.empty')}
                            </td>
                        </tr>
                    )}
                    {entries.map((e) => (
                        <tr key={e.id} className="hover:bg-muted/30">
                            <Td>
                                <input
                                    type="checkbox"
                                    aria-label={`Select ${e.title}`}
                                    checked={selected.includes(e.id)}
                                    onChange={() => setSelected((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))}
                                />
                            </Td>
                            <Td>
                                <Link href={`/admin/entries/${e.id}`} className="hover:text-primary font-medium">
                                    {e.featured && <Star className="mr-1 inline size-3.5 fill-amber-400 text-amber-400" aria-label="featured" />}
                                    {e.title}
                                </Link>
                                <div className="text-muted-foreground font-mono text-[11px]">{e.key}</div>
                            </Td>
                            <Td className="text-muted-foreground">{tm(`types.${e.type}`)}</Td>
                            <Td>
                                <StatusPill status={e.deleted_at ? 'trashed' : e.status} />
                            </Td>
                            <Td>
                                <VerificationBadge status={e.verification} size="xs" />
                            </Td>
                            <Td>
                                <LocaleDots
                                    cells={e.locales}
                                    locales={locales}
                                    hrefFor={can('translations.edit') ? (l) => `/admin/translations/${e.id}/${l}` : undefined}
                                />
                            </Td>
                            <Td className="text-muted-foreground text-xs whitespace-nowrap">
                                {relativeTime(e.updated_at, locale)}
                                {e.editor && <div>{e.editor}</div>}
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </DataTable>
            <Pagination pagination={pagination} />
        </AdminLayout>
    );
}

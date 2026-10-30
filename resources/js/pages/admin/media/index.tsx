import { AdminLayout, ConfirmButton, Pagination, Panel, SelectInput, TextArea, TextInput } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { AtlasShared, MediaItem } from '@/types/atlas';
import { router, useForm, usePage } from '@inertiajs/react';
import { Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Item = MediaItem & {
    alt_all: Record<string, string>;
    caption_all: Record<string, string>;
    tags: string[];
    mime: string | null;
    size: number | null;
    usage_count: number;
    created_at: string;
};

interface Props extends AtlasShared {
    items: Item[];
    pagination: { current: number; last: number; total: number };
    filters: Record<string, string | undefined>;
    usageOptions: string[];
    locales: { code: string; native: string; name: string; intl: string }[];
    limits: { max_kb: number; mimes: string[] };
}

export default function MediaIndex() {
    const { items, pagination, filters, usageOptions, limits, auth } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const canManage = auth.user?.permissions.includes('media.manage');
    const [editing, setEditing] = useState<Item | null>(null);
    const upload = useForm<{
        file: File | null;
        title: string;
        attribution: string;
        source_url: string;
        license: string;
        usage_status: string;
        alt_en: string;
    }>({ file: null, title: '', attribution: '', source_url: '', license: '', usage_status: 'original', alt_en: '' });
    const usageOpts = usageOptions.map((u) => ({ value: u, label: t(`media.usage_status.${u}`) }));
    const apply = (patch: Record<string, string | undefined>) =>
        router.get('/admin/media', Object.fromEntries(Object.entries({ ...filters, ...patch }).filter(([, v]) => v)) as Record<string, string>, {
            preserveState: true,
        });

    return (
        <AdminLayout title={t('media.title')} description={t('media.subtitle')} breadcrumbs={[{ title: t('nav.media'), href: '/admin/media' }]}>
            <Panel title={t('media.upload')}>
                <form
                    className="grid gap-4 md:grid-cols-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        upload.post('/admin/media', { forceFormData: true, preserveScroll: true, onSuccess: () => upload.reset() });
                    }}
                >
                    <div className="space-y-1.5 md:col-span-3">
                        <label htmlFor="media-file" className="text-sm font-medium">
                            {t('media.file')}
                        </label>
                        <input
                            id="media-file"
                            type="file"
                            accept={limits.mimes.map((m) => `.${m}`).join(',')}
                            onChange={(e) => upload.setData('file', e.target.files?.[0] ?? null)}
                            className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2"
                        />
                        <p className="text-muted-foreground text-xs">{t('media.file_help', { max: Math.round(limits.max_kb / 1024) })}</p>
                        {upload.errors.file && <p className="text-destructive text-sm">{upload.errors.file}</p>}
                    </div>
                    <TextInput
                        label={t('media.attribution')}
                        value={upload.data.attribution}
                        onChange={(v) => upload.setData('attribution', v)}
                        error={upload.errors.attribution}
                        required
                    />
                    <TextInput
                        label={t('media.source_url')}
                        type="url"
                        value={upload.data.source_url}
                        onChange={(v) => upload.setData('source_url', v)}
                        error={upload.errors.source_url}
                    />
                    <SelectInput
                        label={t('media.usage')}
                        value={upload.data.usage_status}
                        onChange={(v) => upload.setData('usage_status', v)}
                        options={usageOpts}
                        error={upload.errors.usage_status}
                    />
                    <TextInput
                        label={t('media.alt_en')}
                        value={upload.data.alt_en}
                        onChange={(v) => upload.setData('alt_en', v)}
                        error={upload.errors.alt_en}
                        required
                    />
                    <TextInput label={t('media.license')} value={upload.data.license} onChange={(v) => upload.setData('license', v)} />
                    <TextInput label={t('common.title')} value={upload.data.title} onChange={(v) => upload.setData('title', v)} />
                    <div className="flex items-center gap-3 md:col-span-3">
                        <Button type="submit" disabled={upload.processing || !upload.data.file}>
                            {upload.processing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {t('media.upload')}
                        </Button>
                        {upload.progress && (
                            <span className="text-muted-foreground text-sm">{t('media.uploading', { pct: upload.progress.percentage })}</span>
                        )}
                    </div>
                </form>
            </Panel>

            <div className="flex flex-wrap gap-2">
                <input
                    defaultValue={filters.q}
                    onKeyDown={(e) => e.key === 'Enter' && apply({ q: (e.target as HTMLInputElement).value || undefined })}
                    placeholder={t('common.search')}
                    aria-label={t('common.search')}
                    className="bg-background min-h-10 flex-1 rounded-md border px-3 text-sm"
                />
                <select
                    aria-label={t('common.type')}
                    value={filters.kind ?? ''}
                    onChange={(e) => apply({ kind: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">{t('common.all')}</option>
                    <option value="image">Image</option>
                    <option value="embed">{t('media.embed')}</option>
                </select>
                <select
                    aria-label={t('media.usage')}
                    value={filters.usage ?? ''}
                    onChange={(e) => apply({ usage: e.target.value || undefined })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('media.usage')}: {t('common.all')}
                    </option>
                    {usageOpts.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {items.length === 0 ? (
                <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">{t('common.empty')}</p>
            ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {items.map((m) => (
                        <li key={m.id} className="bg-card overflow-hidden rounded-xl border">
                            <button type="button" onClick={() => setEditing(m)} className="block w-full text-left">
                                <div className="bg-muted flex aspect-video items-center justify-center">
                                    {m.thumb ? (
                                        <img src={m.thumb} alt={m.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
                                    ) : (
                                        <span className="text-muted-foreground text-xs">
                                            {m.embed_provider}/{m.embed_id}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5 p-2.5">
                                    <p className="truncate text-sm font-medium">{m.title}</p>
                                    <p className="text-muted-foreground truncate text-xs">{t(`media.usage_status.${m.usage_status}`)}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {m.usage_count ? t('media.used_by', { count: m.usage_count }) : t('media.unused')}
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <Pagination pagination={pagination} />

            {editing && <MediaDialog item={editing} onClose={() => setEditing(null)} usageOpts={usageOpts} canManage={!!canManage} />}
        </AdminLayout>
    );
}

function MediaDialog({
    item,
    onClose,
    usageOpts,
    canManage,
}: {
    item: Item;
    onClose: () => void;
    usageOpts: { value: string; label: string }[];
    canManage: boolean;
}) {
    const { t } = useTranslation('admin');
    const { locales } = usePage<Props>().props;
    const form = useForm({
        title: item.title ?? '',
        attribution: item.attribution ?? '',
        source_url: item.source_url ?? '',
        license: item.license ?? '',
        usage_status: item.usage_status,
        alt: { ...(item.alt_all ?? {}) } as Record<string, string>,
        caption: { ...(item.caption_all ?? {}) } as Record<string, string>,
        tags: item.tags ?? [],
    });
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription>{item.usage_count ? t('media.used_by', { count: item.usage_count }) : t('media.unused')}</DialogDescription>
                {item.url && <img src={item.url} alt={item.alt ?? ''} className="max-h-64 w-full rounded-lg object-contain" />}
                <fieldset disabled={!canManage} className="grid gap-3 sm:grid-cols-2">
                    <TextInput label={t('common.title')} value={form.data.title} onChange={(v) => form.setData('title', v)} />
                    <TextInput label={t('media.attribution')} value={form.data.attribution} onChange={(v) => form.setData('attribution', v)} />
                    <TextInput
                        label={t('media.source_url')}
                        value={form.data.source_url}
                        onChange={(v) => form.setData('source_url', v)}
                        error={form.errors.source_url}
                    />
                    <TextInput label={t('media.license')} value={form.data.license} onChange={(v) => form.setData('license', v)} />
                    <SelectInput
                        label={t('media.usage')}
                        value={form.data.usage_status}
                        onChange={(v) => form.setData('usage_status', v)}
                        options={usageOpts}
                    />
                    <TextInput
                        label={t('media.tags')}
                        value={form.data.tags.join(', ')}
                        onChange={(v) =>
                            form.setData(
                                'tags',
                                v
                                    .split(',')
                                    .map((x) => x.trim())
                                    .filter(Boolean),
                            )
                        }
                    />
                    {locales.map((l) => (
                        <TextArea
                            key={l.code}
                            label={`${t('media.alt')} · ${l.native}`}
                            value={form.data.alt[l.code] ?? ''}
                            onChange={(v) => form.setData('alt', { ...form.data.alt, [l.code]: v })}
                            rows={2}
                        />
                    ))}
                    <TextArea
                        className="sm:col-span-2"
                        label={`${t('media.caption')} · English`}
                        value={form.data.caption.en ?? ''}
                        onChange={(v) => form.setData('caption', { ...form.data.caption, en: v })}
                        rows={2}
                    />
                </fieldset>
                {canManage && (
                    <div className="flex flex-wrap justify-between gap-2">
                        <ConfirmButton
                            message={item.usage_count ? t('media.delete_blocked') : t('media.confirm_delete')}
                            disabled={item.usage_count > 0}
                            onConfirm={() => router.delete(`/admin/media/${item.id}`, { onSuccess: onClose })}
                        >
                            {t('common.delete')}
                        </ConfirmButton>
                        <Button
                            onClick={() => form.put(`/admin/media/${item.id}`, { preserveScroll: true, onSuccess: onClose })}
                            disabled={form.processing}
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

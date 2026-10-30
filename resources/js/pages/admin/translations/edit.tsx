import { AdminLayout, ConfirmButton, LocaleDots, Panel, SelectInput, TextArea, TextInput, Toggle, relativeTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AtlasShared } from '@/types/atlas';
import { router, useForm, usePage } from '@inertiajs/react';
import { Copy, Eye, Info, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Tr {
    title: string;
    slug: string;
    summary: string | null;
    body: string | null;
    fields: Record<string, unknown> | null;
    aliases: string[] | null;
    seo_title: string | null;
    seo_description: string | null;
    status: string;
    is_machine: boolean;
    translator: string | null;
    reviewer: string | null;
    reviewed_at: string | null;
    updated_at: string | null;
}

interface Props extends AtlasShared {
    entry: { id: number; type: string; key: string; status: string; title: string };
    locale: string;
    source: Tr | null;
    target: Tr | null;
    overview: Record<string, { status: string; machine: boolean } | null>;
    canPublish: boolean;
    fallbackUrl: string | null;
    previewUrl: string;
}

const COMPARE = ['title', 'summary', 'body', 'seo_title', 'seo_description'] as const;

export default function TranslationEdit() {
    const { entry, locale: target, source, target: tr, overview, canPublish, previewUrl, locales } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const languageName = locales.find((l) => l.code === target)?.native ?? target;
    const [fieldsText, setFieldsText] = useState(JSON.stringify(tr?.fields ?? source?.fields ?? {}, null, 2));
    const [jsonError, setJsonError] = useState<string | null>(null);
    const form = useForm({
        title: tr?.title ?? '',
        slug: tr?.slug ?? '',
        summary: tr?.summary ?? '',
        body: tr?.body ?? '',
        aliases: tr?.aliases ?? [],
        seo_title: tr?.seo_title ?? '',
        seo_description: tr?.seo_description ?? '',
        status: tr?.status ?? 'draft',
        is_machine: tr?.is_machine ?? false,
        mark_reviewed: false as boolean,
    });
    const missing = source ? COMPARE.filter((k) => source[k] && !form.data[k]) : [];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        try {
            const fields = JSON.parse(fieldsText || '{}');
            setJsonError(null);
            form.transform((d) => ({ ...d, fields, aliases: d.aliases.filter(Boolean) }));
            form.put(`/admin/translations/${entry.id}/${target}`, { preserveScroll: true });
        } catch {
            setJsonError(t('entries.invalid_json'));
        }
    };

    const isSource = target === 'en';

    return (
        <AdminLayout
            title={t('translations.edit_title', { title: entry.title, language: languageName })}
            breadcrumbs={[
                { title: t('nav.translations'), href: '/admin/translations' },
                { title: entry.title, href: `/admin/entries/${entry.id}` },
                { title: languageName, href: '#' },
            ]}
            actions={
                <>
                    <Button asChild variant="outline" size="sm">
                        <a href={previewUrl} target="_blank" rel="noreferrer">
                            <Eye className="size-4" /> {t('translations.preview')}
                        </a>
                    </Button>
                    {tr && !isSource && canPublish && (
                        <ConfirmButton
                            message={t('translations.confirm_delete', { language: languageName })}
                            onConfirm={() => router.delete(`/admin/translations/${entry.id}/${target}`)}
                        >
                            {t('translations.delete')}
                        </ConfirmButton>
                    )}
                </>
            }
        >
            <Panel>
                <LocaleDots cells={overview} locales={locales.map((l) => l.code)} hrefFor={(l) => `/admin/translations/${entry.id}/${l}`} />
            </Panel>

            {!tr && !isSource && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                        <p className="font-medium">{t('translations.missing_notice')}</p>
                        <p className="text-muted-foreground">{t('translations.copy_help')}</p>
                    </div>
                    <Button onClick={() => router.post(`/admin/translations/${entry.id}/${target}/copy`)}>
                        <Copy className="size-4" /> {t('translations.copy_source')}
                    </Button>
                </div>
            )}

            <div className="text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                    <span className="text-foreground font-semibold">{t('translations.fallback')}:</span> {t('translations.fallback_help')}
                </p>
            </div>

            <form onSubmit={submit} className="grid gap-4 xl:grid-cols-2">
                {!isSource && source && (
                    <Panel title={t('translations.source')} className="xl:order-1">
                        <dl className="space-y-4 text-sm">
                            {COMPARE.map((k) => (
                                <div key={k}>
                                    <dt className="text-muted-foreground text-xs font-semibold uppercase">
                                        {t(`entries.field_${k === 'seo_title' || k === 'seo_description' ? k : k}`)}
                                    </dt>
                                    <dd className={cn('mt-1 whitespace-pre-wrap', missing.includes(k) && 'rounded bg-amber-500/10 p-1')}>
                                        {source[k] || '—'}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>
                )}
                <Panel title={`${t('translations.target')} · ${languageName}`} className={cn('xl:order-2', isSource && 'xl:col-span-2')}>
                    <div className="space-y-4" lang={target}>
                        {missing.length > 0 && (
                            <p className="rounded bg-amber-500/10 p-2 text-xs">
                                {t('translations.missing_fields')}: {missing.map((m) => t(`entries.field_${m}`)).join(', ')}
                            </p>
                        )}
                        <TextInput
                            label={t('entries.field_title')}
                            value={form.data.title}
                            onChange={(v) => form.setData('title', v)}
                            error={form.errors.title}
                            required
                        />
                        <TextInput
                            label={t('entries.field_slug')}
                            value={form.data.slug}
                            onChange={(v) => form.setData('slug', v)}
                            error={form.errors.slug}
                            help={t('entries.field_slug_help')}
                        />
                        <TextArea
                            label={t('entries.field_summary')}
                            value={form.data.summary}
                            onChange={(v) => form.setData('summary', v)}
                            error={form.errors.summary}
                            rows={3}
                        />
                        <TextArea
                            label={t('entries.field_body')}
                            value={form.data.body}
                            onChange={(v) => form.setData('body', v)}
                            error={form.errors.body}
                            rows={10}
                            help={t('entries.field_body_help')}
                        />
                        <TextArea
                            label={t('entries.field_aliases')}
                            value={form.data.aliases.join('\n')}
                            onChange={(v) => form.setData('aliases', v.split('\n'))}
                            rows={2}
                        />
                        <TextArea
                            label={t('entries.field_fields')}
                            value={fieldsText}
                            onChange={setFieldsText}
                            error={jsonError ?? undefined}
                            rows={8}
                            mono
                        />
                        <TextInput label={t('entries.field_seo_title')} value={form.data.seo_title} onChange={(v) => form.setData('seo_title', v)} />
                        <TextInput
                            label={t('entries.field_seo_description')}
                            value={form.data.seo_description}
                            onChange={(v) => form.setData('seo_description', v)}
                            maxLength={320}
                        />
                        <SelectInput
                            label={t('common.status')}
                            value={form.data.status}
                            onChange={(v) => form.setData('status', v)}
                            options={['draft', 'review', 'published']
                                .filter((s) => canPublish || s !== 'published' || tr?.status === 'published')
                                .map((s) => ({ value: s, label: t(`status.${s}`) }))}
                            help={!canPublish ? t('translations.no_permission_publish') : undefined}
                        />
                        <Toggle
                            label={t('translations.is_machine')}
                            help={t('translations.is_machine_help')}
                            checked={form.data.is_machine}
                            onChange={(v) => form.setData('is_machine', v)}
                        />
                        {canPublish && (
                            <Toggle
                                label={t('translations.mark_reviewed')}
                                checked={form.data.mark_reviewed}
                                onChange={(v) => form.setData('mark_reviewed', v)}
                            />
                        )}
                        {tr && (
                            <p className="text-muted-foreground text-xs">
                                {t('translations.translator')}: {tr.translator ?? '—'} · {relativeTime(tr.updated_at, 'en')}
                                {tr.reviewer && ` · ${t('translations.reviewed_by', { name: tr.reviewer })}`}
                            </p>
                        )}
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Loader2 className="size-4 animate-spin" />} {t('common.save')}
                        </Button>
                    </div>
                </Panel>
            </form>
        </AdminLayout>
    );
}

import {
    AdminLayout,
    ConfirmButton,
    LocaleDots,
    Panel,
    SelectInput,
    StatusPill,
    TextArea,
    TextInput,
    Toggle,
    relativeTime,
} from '@/components/admin/ui';
import { TypePoster } from '@/components/site/type-poster';
import { VerificationBadge } from '@/components/site/verification-badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { AtlasShared, MediaItem } from '@/types/atlas';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ExternalLink, Eye, Loader2, Map as MapIcon, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Specs = Record<string, string | number | boolean | null>;

interface EntryData {
    id: number;
    key: string;
    type: string;
    status: string;
    verification: string;
    confidence: string;
    spoiler_level: string;
    featured: boolean;
    sort_order: number;
    region_id: number | null;
    category_id: number | null;
    hero_media_id: number | null;
    art_preset: string | null;
    event_date: string | null;
    attributes: Record<string, unknown>;
    research_notes: string | null;
    last_verified_at: string | null;
    deleted_at: string | null;
    source: {
        title: string;
        slug: string;
        summary: string | null;
        body: string | null;
        fields: Record<string, unknown> | null;
        aliases: string[] | null;
        seo_title: string | null;
        seo_description: string | null;
        status: string;
    } | null;
    specs: Specs;
    tags: number[];
    gallery: number[];
    videos: MediaItem[];
    sources: {
        id: number;
        title: string;
        url: string;
        publisher: string | null;
        type: string;
        published_on: string | null;
        note: string | null;
        supports: string;
    }[];
    relations: { id: number; direction: 'in' | 'out'; type: string; note: string | null; other: { id: number; title: string; type: string } }[];
    markers: { id: number; x: number; y: number; category: string; precision: string; status: string }[];
    translations: Record<string, { status: string; is_machine: boolean; updated_at: string } | null>;
    history: { from: string | null; to: string; note: string | null; user: string | null; date: string }[];
    revisions: { id: number; summary: string; locale: string | null; user: string | null; date: string }[];
    public_url: string | null;
}

interface Props extends AtlasShared {
    type: string;
    entry: EntryData | null;
    options: {
        statuses: string[];
        verification: string[];
        confidence: string[];
        spoiler_levels: string[];
        relation_types: string[];
        regions: { id: number; title: string }[];
        categories: { id: number; name: string }[];
        tags: { id: number; key: string; name: string }[];
        media: MediaItem[];
        locales: string[];
    };
}

const TABS = ['content', 'details', 'evidence', 'relations', 'media', 'history'] as const;

export default function EntryEdit() {
    const { type, entry, options, auth, locale } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const can = (p: string) => auth.user?.permissions.includes(p) ?? false;
    const isNew = !entry;
    const [tab, setTab] = useState<(typeof TABS)[number]>('content');
    const [fieldsText, setFieldsText] = useState(() => JSON.stringify(entry?.source?.fields ?? {}, null, 2));
    const [fieldsError, setFieldsError] = useState<string | null>(null);
    const [attrsText, setAttrsText] = useState(() => JSON.stringify(entry?.attributes ?? {}, null, 2));
    const [duplicates, setDuplicates] = useState<{ id: number; title: string }[]>([]);

    const form = useForm({
        type,
        key: entry?.key ?? '',
        status: entry?.status ?? 'draft',
        verification: entry?.verification ?? 'unverified',
        verification_note: '',
        confidence: entry?.confidence ?? 'medium',
        spoiler_level: entry?.spoiler_level ?? 'none',
        featured: entry?.featured ?? false,
        sort_order: entry?.sort_order ?? 0,
        region_id: entry?.region_id ?? null,
        category_id: entry?.category_id ?? null,
        hero_media_id: entry?.hero_media_id ?? null,
        art_preset: entry?.art_preset ?? '',
        event_date: entry?.event_date ?? '',
        research_notes: entry?.research_notes ?? '',
        mark_verified: false as boolean,
        tags: entry?.tags ?? [],
        gallery: entry?.gallery ?? [],
        specs: (entry?.specs ?? {}) as Specs,
        source: {
            title: entry?.source?.title ?? '',
            slug: entry?.source?.slug ?? '',
            summary: entry?.source?.summary ?? '',
            body: entry?.source?.body ?? '',
            aliases: entry?.source?.aliases ?? [],
            seo_title: entry?.source?.seo_title ?? '',
            seo_description: entry?.source?.seo_description ?? '',
            status: entry?.source?.status ?? 'published',
        },
    });
    const d = form.data;
    const err = form.errors as Record<string, string | undefined>;
    const setSource = (k: keyof typeof d.source, v: unknown) => form.setData('source', { ...d.source, [k]: v });
    const setSpec = (k: string, v: string | boolean) => form.setData('specs', { ...d.specs, [k]: v === '' ? null : v });

    useEffect(() => {
        const title = d.source.title.trim();
        if (title.length < 3) return setDuplicates([]);
        const id = setTimeout(() => {
            const params = new URLSearchParams({ type, title, ...(entry ? { ignore: String(entry.id) } : {}) });
            api<{ data: { id: number; title: string }[] }>(`/admin/entries/duplicates?${params}`)
                .then((r) => setDuplicates(r.data))
                .catch(() => undefined);
        }, 500);
        return () => clearTimeout(id);
    }, [d.source.title, type, entry]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        let fields: Record<string, unknown>;
        let attributes: Record<string, unknown>;
        try {
            fields = JSON.parse(fieldsText || '{}');
            attributes = JSON.parse(attrsText || '{}');
            setFieldsError(null);
        } catch {
            setFieldsError(t('entries.invalid_json'));
            setTab('content');
            return;
        }
        form.transform((data) => ({
            ...data,
            attributes,
            source: { ...data.source, fields },
            region_id: data.region_id || null,
            category_id: data.category_id || null,
            hero_media_id: data.hero_media_id || null,
            event_date: data.event_date || null,
            art_preset: data.art_preset || null,
        }));
        const opts = { preserveScroll: true, onError: () => setTab((cur) => cur) };
        if (isNew) form.post('/admin/entries', opts);
        else form.put(`/admin/entries/${entry.id}`, opts);
    };

    const typeLabel = tm(`types.${type}`);
    const title = isNew ? t('entries.create_title', { type: typeLabel }) : t('entries.edit_title', { type: typeLabel });
    const readOnly = !isNew && !can('content.edit');

    return (
        <AdminLayout
            title={isNew ? title : d.source.title || title}
            description={isNew ? undefined : `${typeLabel} · ${entry.key}`}
            breadcrumbs={[
                { title: t('nav.entries'), href: '/admin/entries' },
                { title: isNew ? title : d.source.title, href: entry ? `/admin/entries/${entry.id}` : '#' },
            ]}
            actions={
                !isNew && (
                    <>
                        <Button asChild variant="outline" size="sm">
                            <a href={`/admin/entries/${entry.id}/preview?locale=en`} target="_blank" rel="noreferrer">
                                <Eye className="size-4" /> {t('common.preview')}
                            </a>
                        </Button>
                        {entry.public_url && (
                            <Button asChild variant="outline" size="sm">
                                <a href={entry.public_url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="size-4" /> {t('common.view_public')}
                                </a>
                            </Button>
                        )}
                        {entry.deleted_at
                            ? can('content.delete') && (
                                  <Button size="sm" variant="outline" onClick={() => router.post(`/admin/entries/${entry.id}/restore`)}>
                                      {t('common.restore')}
                                  </Button>
                              )
                            : can('content.delete') && (
                                  <ConfirmButton message={t('entries.confirm_delete')} onConfirm={() => router.delete(`/admin/entries/${entry.id}`)}>
                                      <Trash2 className="size-4" /> {t('common.delete')}
                                  </ConfirmButton>
                              )}
                    </>
                )
            }
        >
            {entry?.deleted_at && <Notice tone="red">{t('entries.trashed_notice')}</Notice>}
            {!can('content.publish') && <Notice tone="amber">{t('entries.contributor_notice')}</Notice>}

            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="min-w-0 space-y-4">
                    {!isNew && (
                        <div role="tablist" className="flex gap-1 overflow-x-auto border-b">
                            {TABS.map((tb) => (
                                <button
                                    key={tb}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === tb}
                                    onClick={() => setTab(tb)}
                                    className={cn(
                                        '-mb-px min-h-10 shrink-0 border-b-2 px-3 text-sm font-medium',
                                        tab === tb
                                            ? 'border-primary text-foreground'
                                            : 'text-muted-foreground hover:text-foreground border-transparent',
                                    )}
                                >
                                    {t(`entries.tab_${tb}`)}
                                </button>
                            ))}
                        </div>
                    )}

                    {(isNew || tab === 'content') && (
                        <Panel title={t('entries.source_language')} description={t('entries.source_help')}>
                            <fieldset disabled={readOnly} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextInput
                                        label={t('entries.field_title')}
                                        value={d.source.title}
                                        onChange={(v) => setSource('title', v)}
                                        error={err['source.title']}
                                        required
                                        maxLength={255}
                                    />
                                    <TextInput
                                        label={t('entries.key')}
                                        value={d.key}
                                        onChange={(v) => form.setData('key', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                        error={err.key}
                                        help={t('entries.key_help')}
                                        required
                                        maxLength={128}
                                    />
                                </div>
                                {duplicates.length > 0 && (
                                    <Notice tone="amber">
                                        {t('entries.duplicates_help')}{' '}
                                        {duplicates.map((dup, i) => (
                                            <span key={dup.id}>
                                                {i > 0 && ', '}
                                                <Link href={`/admin/entries/${dup.id}`} className="underline">
                                                    {dup.title}
                                                </Link>
                                            </span>
                                        ))}
                                    </Notice>
                                )}
                                <TextInput
                                    label={t('entries.field_slug')}
                                    value={d.source.slug}
                                    onChange={(v) => setSource('slug', v)}
                                    error={err['source.slug']}
                                    help={t('entries.field_slug_help')}
                                />
                                <TextArea
                                    label={t('entries.field_summary')}
                                    value={d.source.summary}
                                    onChange={(v) => setSource('summary', v)}
                                    error={err['source.summary']}
                                    rows={3}
                                    maxLength={2000}
                                />
                                <TextArea
                                    label={t('entries.field_body')}
                                    value={d.source.body}
                                    onChange={(v) => setSource('body', v)}
                                    error={err['source.body']}
                                    help={t('entries.field_body_help')}
                                    rows={12}
                                />
                                <TextArea
                                    label={t('entries.field_aliases')}
                                    value={(d.source.aliases ?? []).join('\n')}
                                    onChange={(v) => setSource('aliases', v.split('\n'))}
                                    help={t('entries.field_aliases_help')}
                                    rows={2}
                                />
                                <TextArea
                                    label={t('entries.field_fields')}
                                    value={fieldsText}
                                    onChange={setFieldsText}
                                    error={fieldsError ?? err['source.fields']}
                                    help={t('entries.field_fields_help')}
                                    rows={10}
                                    mono
                                />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <TextInput
                                        label={t('entries.field_seo_title')}
                                        value={d.source.seo_title}
                                        onChange={(v) => setSource('seo_title', v)}
                                        maxLength={255}
                                    />
                                    <TextInput
                                        label={t('entries.field_seo_description')}
                                        value={d.source.seo_description}
                                        onChange={(v) => setSource('seo_description', v)}
                                        maxLength={320}
                                    />
                                </div>
                            </fieldset>
                        </Panel>
                    )}

                    {(isNew || tab === 'details') && (
                        <Panel title={t('entries.specs')}>
                            <fieldset disabled={readOnly} className="space-y-4">
                                <SpecsForm type={type} specs={d.specs} setSpec={setSpec} errors={err} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectInput
                                        label={t('entries.region')}
                                        value={d.region_id}
                                        onChange={(v) => form.setData('region_id', v ? Number(v) : null)}
                                        options={options.regions.map((r) => ({ value: r.id, label: r.title }))}
                                        allowEmpty={t('common.none')}
                                        error={err.region_id}
                                    />
                                    {options.categories.length > 0 && (
                                        <SelectInput
                                            label={t('entries.category')}
                                            value={d.category_id}
                                            onChange={(v) => form.setData('category_id', v ? Number(v) : null)}
                                            options={options.categories.map((c) => ({ value: c.id, label: c.name }))}
                                            allowEmpty={t('common.none')}
                                        />
                                    )}
                                    <TextInput
                                        label={t('entries.event_date')}
                                        type="date"
                                        value={d.event_date}
                                        onChange={(v) => form.setData('event_date', v)}
                                        error={err.event_date}
                                    />
                                    <TextInput
                                        label={t('entries.sort_order')}
                                        type="number"
                                        value={d.sort_order}
                                        onChange={(v) => form.setData('sort_order', Number(v))}
                                    />
                                </div>
                                <TextArea
                                    label="Attributes (JSON)"
                                    value={attrsText}
                                    onChange={setAttrsText}
                                    rows={4}
                                    mono
                                    help="e.g. real_world_analogue, analogue_verification, music, duration, kind"
                                />
                                <fieldset>
                                    <legend className="mb-2 text-sm font-medium">{t('entries.tags')}</legend>
                                    <div className="flex flex-wrap gap-1.5">
                                        {options.tags.map((tag) => {
                                            const on = d.tags.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() =>
                                                        form.setData('tags', on ? d.tags.filter((x) => x !== tag.id) : [...d.tags, tag.id])
                                                    }
                                                    className={cn(
                                                        'min-h-8 rounded-full border px-2.5 text-xs',
                                                        on ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                                <TextArea
                                    label={t('entries.research_notes')}
                                    value={d.research_notes}
                                    onChange={(v) => form.setData('research_notes', v)}
                                    rows={3}
                                />
                            </fieldset>
                        </Panel>
                    )}

                    {!isNew && tab === 'evidence' && <EvidenceTab entry={entry} canVerify={can('content.verify')} />}
                    {!isNew && tab === 'relations' && (
                        <RelationsTab entry={entry} relationTypes={options.relation_types} canEdit={can('relations.edit')} />
                    )}
                    {!isNew && tab === 'media' && (
                        <Panel title={t('entries.tab_media')}>
                            <div className="space-y-5">
                                <div>
                                    <p className="mb-2 text-sm font-medium">{t('entries.hero_media')}</p>
                                    <MediaPicker
                                        media={options.media}
                                        selected={d.hero_media_id ? [d.hero_media_id] : []}
                                        onToggle={(id) => form.setData('hero_media_id', d.hero_media_id === id ? null : id)}
                                    />
                                </div>
                                <div>
                                    <p className="mb-2 text-sm font-medium">{t('entries.gallery')}</p>
                                    <MediaPicker
                                        media={options.media}
                                        selected={d.gallery}
                                        onToggle={(id) =>
                                            form.setData('gallery', d.gallery.includes(id) ? d.gallery.filter((x) => x !== id) : [...d.gallery, id])
                                        }
                                    />
                                </div>
                                {entry.videos.length > 0 && (
                                    <div>
                                        <p className="mb-2 text-sm font-medium">{t('entries.videos')}</p>
                                        <ul className="space-y-1 text-sm">
                                            {entry.videos.map((v) => (
                                                <li key={v.id}>
                                                    {v.title} ·{' '}
                                                    <span className="text-muted-foreground">
                                                        {v.embed_provider}/{v.embed_id}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div>
                                    <p className="mb-2 flex items-center justify-between text-sm font-medium">
                                        {t('entries.markers')}
                                        {can('map.edit') && (
                                            <Link href="/admin/map" className="text-primary inline-flex items-center gap-1 text-xs">
                                                <MapIcon className="size-3.5" /> {t('entries.open_map_editor')}
                                            </Link>
                                        )}
                                    </p>
                                    {entry.markers.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">{t('common.empty')}</p>
                                    ) : (
                                        <ul className="space-y-1 text-sm">
                                            {entry.markers.map((m) => (
                                                <li key={m.id} className="font-mono text-xs">
                                                    #{m.id} {m.category} ({m.x.toFixed(3)}, {m.y.toFixed(3)}) · {m.precision} · {m.status}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    )}
                    {!isNew && tab === 'history' && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <Panel title={t('entries.verification_history')}>
                                <ol className="space-y-3">
                                    {entry.history.map((h, i) => (
                                        <li key={i} className="text-sm">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {h.from && (
                                                    <>
                                                        <VerificationBadge status={h.from} size="xs" /> →
                                                    </>
                                                )}
                                                <VerificationBadge status={h.to} size="xs" />
                                            </div>
                                            {h.note && <p className="mt-1">{h.note}</p>}
                                            <p className="text-muted-foreground text-xs">
                                                {h.user ?? '—'} · {relativeTime(h.date, locale)}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </Panel>
                            <Panel title={t('entries.revisions')}>
                                <ol className="divide-y">
                                    {entry.revisions.map((r) => (
                                        <li key={r.id} className="py-2 text-sm">
                                            {r.summary}
                                            <span className="text-muted-foreground block text-xs">
                                                {r.user ?? '—'} · {relativeTime(r.date, locale)}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </Panel>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <Panel title={t('entries.publishing')}>
                        <fieldset disabled={readOnly} className="space-y-3">
                            <SelectInput
                                label={t('entries.status')}
                                value={d.status}
                                onChange={(v) => form.setData('status', v)}
                                options={options.statuses
                                    .filter((s) => can('content.publish') || s === 'draft' || s === 'review')
                                    .map((s) => ({ value: s, label: t(`status.${s}`) }))}
                                error={err.status}
                            />
                            <SelectInput
                                label={t('entries.verification')}
                                value={d.verification}
                                onChange={(v) => form.setData('verification', v)}
                                options={options.verification.map((v) => ({ value: v, label: tm(`verification.${v}`) }))}
                                error={err.verification}
                                disabled={!isNew && !can('content.verify')}
                            />
                            {!isNew && d.verification !== entry.verification && (
                                <TextInput
                                    label={t('entries.verification_note')}
                                    value={d.verification_note}
                                    onChange={(v) => form.setData('verification_note', v)}
                                />
                            )}
                            <SelectInput
                                label={t('entries.confidence')}
                                value={d.confidence}
                                onChange={(v) => form.setData('confidence', v)}
                                options={options.confidence.map((c) => ({ value: c, label: tm(`confidence.${c}`) }))}
                            />
                            <SelectInput
                                label={t('entries.spoiler')}
                                value={d.spoiler_level}
                                onChange={(v) => form.setData('spoiler_level', v)}
                                options={options.spoiler_levels.map((s) => ({ value: s, label: tm(`spoiler.${s}`) }))}
                            />
                            {can('content.publish') && (
                                <Toggle label={t('entries.featured')} checked={d.featured} onChange={(v) => form.setData('featured', v)} />
                            )}
                            {!isNew && can('content.verify') && (
                                <Toggle
                                    label={t('entries.mark_verified')}
                                    checked={d.mark_verified}
                                    onChange={(v) => form.setData('mark_verified', v)}
                                />
                            )}
                            {entry?.last_verified_at && (
                                <p className="text-muted-foreground text-xs">
                                    {t('entries.last_verified')}: {relativeTime(entry.last_verified_at, locale)}
                                </p>
                            )}
                        </fieldset>
                        {!readOnly && (
                            <Button type="submit" className="mt-4 w-full" disabled={form.processing}>
                                {form.processing && <Loader2 className="size-4 animate-spin" />}
                                {form.processing ? t('common.saving') : t('common.save')}
                            </Button>
                        )}
                        {Object.keys(form.errors).length > 0 && (
                            <p className="text-destructive mt-3 text-xs" role="alert">
                                {Object.values(form.errors)[0]}
                            </p>
                        )}
                    </Panel>

                    <Panel title={t('entries.art_preset')} description={t('entries.art_help')}>
                        <div className="mb-3 aspect-video overflow-hidden rounded-lg">
                            <TypePoster title={d.source.title || '—'} type={type} />
                        </div>
                    </Panel>

                    {entry && (
                        <Panel title={t('entries.translation_status')}>
                            <LocaleDots
                                cells={entry.translations}
                                locales={options.locales}
                                hrefFor={can('translations.edit') ? (l) => `/admin/translations/${entry.id}/${l}` : undefined}
                            />
                        </Panel>
                    )}
                </aside>
            </form>
        </AdminLayout>
    );
}

function Notice({ tone, children }: { tone: 'amber' | 'red'; children: React.ReactNode }) {
    return (
        <div
            role="note"
            className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                tone === 'amber' ? 'border-amber-500/40 bg-amber-500/10' : 'border-red-500/40 bg-red-500/10',
            )}
        >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>{children}</div>
        </div>
    );
}

function SpecsForm({
    type,
    specs,
    setSpec,
    errors,
}: {
    type: string;
    specs: Specs;
    setSpec: (k: string, v: string | boolean) => void;
    errors: Record<string, string | undefined>;
}) {
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const verOpts = ['official', 'verified_in_game', 'strong_evidence', 'reported', 'rumor', 'theory', 'unverified', 'debunked'].map((v) => ({
        value: v,
        label: tm(`verification.${v}`),
    }));
    const str = (k: string) => (specs[k] ?? '') as string;
    const text = (k: string, label = tm(`specs.${k}`)) => (
        <TextInput key={k} label={label} value={str(k)} onChange={(v) => setSpec(k, v)} error={errors[`specs.${k}`]} />
    );
    const stat = (k: string) => (
        <TextInput
            key={k}
            label={tm(`specs.${k}`)}
            type="number"
            min={0}
            max={100}
            value={str(k)}
            onChange={(v) => setSpec(k, v)}
            error={errors[`specs.${k}`]}
        />
    );

    if (type === 'vehicle')
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {text('manufacturer')}
                    {text('model')}
                    <SelectInput
                        label={tm('specs.vehicle_class')}
                        value={str('vehicle_class') || 'car'}
                        onChange={(v) => setSpec('vehicle_class', v)}
                        options={[
                            'car',
                            'sports',
                            'muscle',
                            'suv',
                            'truck',
                            'motorcycle',
                            'boat',
                            'aircraft',
                            'emergency',
                            'offroad',
                            'industrial',
                        ].map((c) => ({ value: c, label: tm(`vehicle_class.${c}`) }))}
                    />
                    {text('body_style')}
                    {text('real_world_inspiration')}
                    <SelectInput
                        label={`${tm('specs.real_world_inspiration')} · ${tm('list.verification')}`}
                        value={str('inspiration_verification')}
                        onChange={(v) => setSpec('inspiration_verification', v)}
                        options={verOpts}
                        allowEmpty="—"
                    />
                    {text('first_seen')}
                    {text('seats')}
                    <SelectInput
                        label={tm('specs.drivetrain')}
                        value={str('drivetrain')}
                        onChange={(v) => setSpec('drivetrain', v)}
                        options={['fwd', 'rwd', 'awd', '4wd'].map((x) => ({ value: x, label: x.toUpperCase() }))}
                        allowEmpty={t('common.unknown')}
                    />
                </div>
                <p className="text-muted-foreground text-xs">{t('entries.stats_help')}</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {['top_speed', 'acceleration', 'braking', 'handling', 'durability'].map(stat)}
                </div>
                <SelectInput
                    label={tm('specs.stats_status')}
                    value={str('stats_verification')}
                    onChange={(v) => setSpec('stats_verification', v)}
                    options={[{ value: 'unknown', label: t('common.unknown') }, ...verOpts]}
                    allowEmpty="—"
                />
            </div>
        );
    if (type === 'character')
        return (
            <div className="grid gap-4 md:grid-cols-2">
                {text('full_name')}
                <SelectInput
                    label={tm('specs.role')}
                    value={str('role') || 'supporting'}
                    onChange={(v) => setSpec('role', v)}
                    options={['protagonist', 'supporting', 'minor'].map((r) => ({ value: r, label: tm(`character_role.${r}`) }))}
                />
                {text('affiliation')}
                {text('first_seen')}
                {text('voice_actor')}
                <SelectInput
                    label={`${tm('specs.voice_actor')} · ${tm('list.verification')}`}
                    value={str('voice_actor_verification')}
                    onChange={(v) => setSpec('voice_actor_verification', v)}
                    options={verOpts}
                    allowEmpty="—"
                />
            </div>
        );
    if (type === 'weapon')
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <SelectInput
                        label={tm('specs.weapon_class')}
                        value={str('weapon_class') || 'unknown'}
                        onChange={(v) => setSpec('weapon_class', v)}
                        options={['handgun', 'smg', 'shotgun', 'rifle', 'sniper', 'heavy', 'melee', 'throwable', 'unknown'].map((c) => ({
                            value: c,
                            label: c,
                        }))}
                    />
                    {text('first_seen')}
                    {stat('magazine')}
                </div>
                <p className="text-muted-foreground text-xs">{t('entries.stats_help')}</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{['damage', 'fire_rate', 'range', 'accuracy'].map(stat)}</div>
            </div>
        );
    if (type === 'mission')
        return (
            <div className="grid gap-4 md:grid-cols-3">
                <SelectInput
                    label={tm('specs.mission_type')}
                    value={str('mission_type') || 'main'}
                    onChange={(v) => setSpec('mission_type', v)}
                    options={['main', 'side', 'story_arc', 'activity'].map((c) => ({ value: c, label: tm(`mission_type.${c}`) }))}
                />
                <TextInput label={tm('specs.sequence')} type="number" value={str('sequence')} onChange={(v) => setSpec('sequence', v)} />
                <TextInput label={tm('specs.reward_cash')} type="number" value={str('reward_cash')} onChange={(v) => setSpec('reward_cash', v)} />
                <Toggle label={tm('specs.missable')} checked={!!specs.missable} onChange={(v) => setSpec('missable', v)} />
            </div>
        );
    return null;
}

function MediaPicker({ media, selected, onToggle }: { media: MediaItem[]; selected: number[]; onToggle: (id: number) => void }) {
    const { t } = useTranslation('admin');
    if (media.length === 0)
        return (
            <p className="text-muted-foreground text-sm">
                {t('common.empty')}{' '}
                <Link href="/admin/media" className="text-primary">
                    {t('nav.media')}
                </Link>
            </p>
        );
    return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {media.map((m) => (
                <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggle(m.id)}
                    aria-pressed={selected.includes(m.id)}
                    className={cn(
                        'relative aspect-square overflow-hidden rounded-md ring-2',
                        selected.includes(m.id) ? 'ring-primary' : 'ring-transparent',
                    )}
                >
                    {m.thumb && <img src={m.thumb} alt={m.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />}
                </button>
            ))}
        </div>
    );
}

function EvidenceTab({ entry, canVerify }: { entry: EntryData; canVerify: boolean }) {
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const form = useForm({ url: '', title: '', publisher: '', type: 'press', published_on: '', note: '', supports: 'primary' });
    return (
        <div className="space-y-4">
            <Panel title={t('entries.sources')}>
                {entry.sources.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('entries.no_sources')}</p>
                ) : (
                    <ul className="divide-y">
                        {entry.sources.map((s) => (
                            <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0 text-sm">
                                    <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-primary font-medium break-words">
                                        {s.title}
                                    </a>
                                    <p className="text-muted-foreground text-xs">
                                        {tm(`entry.source_type.${s.type}`)} · {s.publisher} · {tm(`entry.supports.${s.supports}`)}{' '}
                                        {s.published_on && `· ${s.published_on}`}
                                    </p>
                                    {s.note && <p className="mt-1">{s.note}</p>}
                                </div>
                                {canVerify && (
                                    <ConfirmButton
                                        variant="ghost"
                                        size="icon"
                                        message={`${t('common.remove')}: ${s.title}`}
                                        onConfirm={() => router.delete(`/admin/entries/${entry.id}/sources/${s.id}`, { preserveScroll: true })}
                                    >
                                        <X className="size-4" />
                                    </ConfirmButton>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {canVerify && (
                <Panel title={t('entries.add_source')}>
                    <form
                        className="grid gap-4 md:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(`/admin/entries/${entry.id}/sources`, { preserveScroll: true, onSuccess: () => form.reset() });
                        }}
                    >
                        <TextInput
                            label={t('entries.source_url')}
                            type="url"
                            value={form.data.url}
                            onChange={(v) => form.setData('url', v)}
                            error={form.errors.url}
                            required
                        />
                        <TextInput
                            label={t('entries.source_title')}
                            value={form.data.title}
                            onChange={(v) => form.setData('title', v)}
                            error={form.errors.title}
                            required
                        />
                        <TextInput label={t('entries.source_publisher')} value={form.data.publisher} onChange={(v) => form.setData('publisher', v)} />
                        <SelectInput
                            label={t('entries.source_type')}
                            value={form.data.type}
                            onChange={(v) => form.setData('type', v)}
                            options={['official', 'press', 'community', 'wiki', 'video'].map((x) => ({
                                value: x,
                                label: tm(`entry.source_type.${x}`),
                            }))}
                        />
                        <TextInput
                            label={t('entries.source_published')}
                            type="date"
                            value={form.data.published_on}
                            onChange={(v) => form.setData('published_on', v)}
                        />
                        <SelectInput
                            label={t('entries.source_supports')}
                            value={form.data.supports}
                            onChange={(v) => form.setData('supports', v)}
                            options={['primary', 'context', 'disputes'].map((x) => ({ value: x, label: tm(`entry.supports.${x}`) }))}
                        />
                        <TextArea
                            className="md:col-span-2"
                            label={t('entries.source_note')}
                            value={form.data.note}
                            onChange={(v) => form.setData('note', v)}
                            rows={2}
                        />
                        <div className="md:col-span-2">
                            <Button type="submit" disabled={form.processing}>
                                {t('entries.add_source')}
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}
        </div>
    );
}

function RelationsTab({ entry, relationTypes, canEdit }: { entry: EntryData; relationTypes: string[]; canEdit: boolean }) {
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<{ id: number; title: string; type: string; status: string }[]>([]);
    const [target, setTarget] = useState<{ id: number; title: string } | null>(null);
    const [type, setType] = useState('related');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (q.trim().length < 2) return setResults([]);
        const id = setTimeout(() => {
            api<{ data: typeof results }>(`/admin/entries/lookup?q=${encodeURIComponent(q.trim())}`)
                .then((r) => setResults(r.data.filter((x) => x.id !== entry.id)))
                .catch(() => undefined);
        }, 250);
        return () => clearTimeout(id);
    }, [q, entry.id]);

    const grouped = useMemo(() => entry.relations, [entry.relations]);

    return (
        <div className="space-y-4">
            <Panel title={t('entries.relations')}>
                {grouped.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('entries.no_relations')}</p>
                ) : (
                    <ul className="divide-y">
                        {grouped.map((r) => (
                            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <span className="min-w-0">
                                    <span className="text-muted-foreground text-xs">
                                        {r.direction === 'out' ? '→' : '←'} {tm(`relation.${r.type}`)}{' '}
                                    </span>
                                    <Link href={`/admin/entries/${r.other.id}`} className="hover:text-primary font-medium">
                                        {r.other.title}
                                    </Link>
                                    <span className="text-muted-foreground text-xs"> · {tm(`types.${r.other.type}`)}</span>
                                    {r.note && <span className="text-muted-foreground block text-xs">{r.note}</span>}
                                </span>
                                {canEdit && (
                                    <ConfirmButton
                                        variant="ghost"
                                        size="icon"
                                        message={`${t('common.remove')}: ${r.other.title}`}
                                        onConfirm={() => router.delete(`/admin/entries/${entry.id}/relations/${r.id}`, { preserveScroll: true })}
                                    >
                                        <X className="size-4" />
                                    </ConfirmButton>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {canEdit && (
                <Panel title={t('entries.add_relation')}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="relative">
                            <TextInput
                                label={t('entries.relation_target')}
                                value={target ? target.title : q}
                                onChange={(v) => {
                                    setTarget(null);
                                    setQ(v);
                                }}
                                placeholder={t('entries.relation_search')}
                            />
                            {!target && results.length > 0 && (
                                <ul className="bg-popover absolute inset-x-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-lg">
                                    {results.map((r) => (
                                        <li key={r.id}>
                                            <button
                                                type="button"
                                                className="hover:bg-muted flex min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-sm"
                                                onClick={() => {
                                                    setTarget(r);
                                                    setResults([]);
                                                }}
                                            >
                                                <span>{r.title}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {tm(`types.${r.type}`)} · <StatusPill status={r.status} />
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <SelectInput
                            label={t('entries.relation_type')}
                            value={type}
                            onChange={setType}
                            options={relationTypes.map((r) => ({ value: r, label: tm(`relation.${r}`) }))}
                        />
                        <TextInput className="md:col-span-2" label={t('common.note')} value={note} onChange={setNote} maxLength={255} />
                        <div>
                            <Button
                                type="button"
                                disabled={!target}
                                onClick={() =>
                                    target &&
                                    router.post(
                                        `/admin/entries/${entry.id}/relations`,
                                        { to_entry_id: target.id, relation_type: type, note },
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setTarget(null);
                                                setQ('');
                                                setNote('');
                                            },
                                        },
                                    )
                                }
                            >
                                {t('common.add')}
                            </Button>
                        </div>
                    </div>
                </Panel>
            )}
        </div>
    );
}

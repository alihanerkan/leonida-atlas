import { AdminLayout, ConfirmButton, Panel, SelectInput, TextArea, TextInput } from '@/components/admin/ui';
import { CATEGORY_COLORS } from '@/components/map/atlas-map';
import { LeonidaMapArt } from '@/components/map/leonida-map';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { AtlasShared } from '@/types/atlas';
import { router, useForm, usePage } from '@inertiajs/react';
import { Download, MapPinPlus, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Marker {
    id: number;
    entry_id: number;
    entry_title: string | null;
    entry_type: string | null;
    entry_status: string | null;
    category: string;
    x: number;
    y: number;
    precision: string;
    basis: string | null;
    zoom: number;
    status: string;
}

interface Props extends AtlasShared {
    markers: Marker[];
    categories: string[];
    report: { duplicates: string[]; overlapping: [number, number][]; unplaced: { id: number; title: string; type: string }[] };
}

const blank = { entry_id: 0, category: 'landmark', x: 0.5, y: 0.5, precision: 'approximate', basis: '', zoom: 3, status: 'draft' };

export default function MapEditor() {
    const { markers, categories, report } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const { t: tm } = useTranslation();
    const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);
    const [entryQuery, setEntryQuery] = useState('');
    const [entryResults, setEntryResults] = useState<{ id: number; title: string; type: string }[]>([]);
    const canvasRef = useRef<HTMLDivElement>(null);
    const form = useForm({ ...blank });
    const selected = typeof selectedId === 'number' ? markers.find((m) => m.id === selectedId) : null;

    useEffect(() => {
        if (selected) {
            form.setData({
                entry_id: selected.entry_id,
                category: selected.category,
                x: selected.x,
                y: selected.y,
                precision: selected.precision,
                basis: selected.basis ?? '',
                zoom: selected.zoom,
                status: selected.status,
            });
            setEntryQuery(selected.entry_title ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    useEffect(() => {
        if (entryQuery.trim().length < 2 || (selected && entryQuery === selected.entry_title)) return setEntryResults([]);
        const id = setTimeout(
            () =>
                api<{ data: { id: number; title: string; type: string }[] }>(`/admin/entries/lookup?q=${encodeURIComponent(entryQuery)}`)
                    .then((r) => setEntryResults(r.data))
                    .catch(() => undefined),
            250,
        );
        return () => clearTimeout(id);
    }, [entryQuery, selected]);

    const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
        if (selectedId === null || !canvasRef.current) return;
        const r = canvasRef.current.getBoundingClientRect();
        form.setData((d) => ({
            ...d,
            x: Number(((e.clientX - r.left) / r.width).toFixed(5)),
            y: Number(((e.clientY - r.top) / r.height).toFixed(5)),
        }));
    };

    const save = () => {
        if (selectedId === 'new') form.post('/admin/map/markers', { preserveScroll: true, onSuccess: () => setSelectedId(null) });
        else if (selected) form.put(`/admin/map/markers/${selected.id}`, { preserveScroll: true });
    };

    const importFile = (file: File) => router.post('/admin/map/import', { file }, { forceFormData: true, preserveScroll: true });
    const issues = report.duplicates.length + report.overlapping.length + report.unplaced.length;

    return (
        <AdminLayout
            title={t('map.title')}
            description={t('map.subtitle')}
            breadcrumbs={[{ title: t('nav.map'), href: '/admin/map' }]}
            actions={
                <>
                    <Button
                        onClick={() => {
                            setSelectedId('new');
                            form.setData({ ...blank });
                            setEntryQuery('');
                        }}
                    >
                        <MapPinPlus className="size-4" /> {t('map.add')}
                    </Button>
                    <Button asChild variant="outline">
                        <a href="/admin/map/export">
                            <Download className="size-4" /> {t('map.export')}
                        </a>
                    </Button>
                    <Button asChild variant="outline">
                        <label className="cursor-pointer">
                            <Upload className="size-4" /> {t('map.import')}
                            <input
                                type="file"
                                accept="application/json,.json"
                                className="sr-only"
                                onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
                            />
                        </label>
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
                <div className="overflow-auto rounded-xl border bg-[#060812]">
                    <div
                        ref={canvasRef}
                        onClick={onCanvasClick}
                        className={cn('relative mx-auto aspect-square w-full max-w-[900px] min-w-[520px]', selectedId !== null && 'cursor-crosshair')}
                    >
                        <LeonidaMapArt className="absolute inset-0 h-full w-full" />
                        {markers.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(m.id);
                                }}
                                className={cn(
                                    'absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black transition-transform hover:scale-150',
                                    m.status === 'draft' && 'opacity-50',
                                    selectedId === m.id && 'scale-150 ring-white',
                                )}
                                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, background: CATEGORY_COLORS[m.category] }}
                                aria-label={`${m.entry_title} (${m.category})`}
                                title={`${m.entry_title} · ${m.category}`}
                            />
                        ))}
                        {selectedId !== null && (
                            <span
                                className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white"
                                style={{ left: `${form.data.x * 100}%`, top: `${form.data.y * 100}%` }}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {selectedId === null ? (
                        <Panel title={t('map.validation')}>
                            {issues === 0 ? (
                                <p className="text-sm text-emerald-400">{t('map.all_good')}</p>
                            ) : (
                                <div className="space-y-3 text-sm">
                                    {report.unplaced.length > 0 && (
                                        <div>
                                            <p className="font-medium">
                                                {t('map.unplaced')} ({report.unplaced.length})
                                            </p>
                                            <ul className="text-muted-foreground mt-1 text-xs">
                                                {report.unplaced.map((u) => (
                                                    <li key={u.id}>{u.title}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {report.overlapping.length > 0 && (
                                        <p>
                                            {t('map.overlapping')}: {report.overlapping.map((p) => p.join('↔')).join(', ')}
                                        </p>
                                    )}
                                    {report.duplicates.length > 0 && (
                                        <p>
                                            {t('map.duplicates')}: {report.duplicates.length}
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-muted-foreground mt-4 text-xs">{t('map.drag_help')}</p>
                        </Panel>
                    ) : (
                        <Panel
                            title={selectedId === 'new' ? t('map.add') : `#${selectedId} · ${selected?.entry_title ?? ''}`}
                            description={selectedId === 'new' ? t('map.add_help') : t('map.move')}
                        >
                            <div className="space-y-3">
                                <div className="relative">
                                    <TextInput
                                        label={t('map.entry')}
                                        value={entryQuery}
                                        onChange={setEntryQuery}
                                        error={form.errors.entry_id}
                                        required
                                    />
                                    {entryResults.length > 0 && (
                                        <ul className="bg-popover absolute inset-x-0 z-10 mt-1 max-h-52 overflow-y-auto rounded-md border shadow-lg">
                                            {entryResults.map((r) => (
                                                <li key={r.id}>
                                                    <button
                                                        type="button"
                                                        className="hover:bg-muted flex min-h-10 w-full justify-between px-3 text-left text-sm"
                                                        onClick={() => {
                                                            form.setData('entry_id', r.id);
                                                            setEntryQuery(r.title);
                                                            setEntryResults([]);
                                                        }}
                                                    >
                                                        {r.title} <span className="text-muted-foreground text-xs">{tm(`types.${r.type}`)}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <SelectInput
                                        label={t('map.category')}
                                        value={form.data.category}
                                        onChange={(v) => form.setData('category', v)}
                                        options={categories.map((c) => ({ value: c, label: tm(`marker.${c}`) }))}
                                    />
                                    <SelectInput
                                        label={t('map.status')}
                                        value={form.data.status}
                                        onChange={(v) => form.setData('status', v)}
                                        options={['draft', 'published'].map((s) => ({ value: s, label: t(`status.${s}`) }))}
                                    />
                                    <TextInput
                                        label={t('map.x')}
                                        type="number"
                                        value={form.data.x}
                                        onChange={(v) => form.setData('x', Number(v))}
                                        error={form.errors.x}
                                    />
                                    <TextInput
                                        label={t('map.y')}
                                        type="number"
                                        value={form.data.y}
                                        onChange={(v) => form.setData('y', Number(v))}
                                        error={form.errors.y}
                                    />
                                    <SelectInput
                                        label={t('map.precision')}
                                        value={form.data.precision}
                                        onChange={(v) => form.setData('precision', v)}
                                        options={[
                                            { value: 'approximate', label: t('map.approximate') },
                                            { value: 'confirmed', label: t('map.confirmed') },
                                        ]}
                                    />
                                    <TextInput
                                        label={t('map.zoom')}
                                        type="number"
                                        min={1}
                                        max={6}
                                        value={form.data.zoom}
                                        onChange={(v) => form.setData('zoom', Number(v))}
                                    />
                                </div>
                                <TextArea
                                    label={t('map.basis')}
                                    help={t('map.basis_help')}
                                    value={form.data.basis}
                                    onChange={(v) => form.setData('basis', v)}
                                    error={form.errors.basis}
                                    rows={3}
                                />
                                <div className="rounded-lg border p-3">
                                    <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">{t('map.popup_preview')}</p>
                                    <p className="font-display text-xl uppercase">{entryQuery || '—'}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {tm(`marker.${form.data.category}`)} ·{' '}
                                        {form.data.precision === 'approximate' ? t('map.approximate') : t('map.confirmed')}
                                    </p>
                                    {form.data.basis && <p className="mt-1 text-xs">{form.data.basis}</p>}
                                </div>
                                <div className="flex flex-wrap justify-between gap-2">
                                    <div className="flex gap-2">
                                        <Button onClick={save} disabled={form.processing || !form.data.entry_id}>
                                            {t('common.save')}
                                        </Button>
                                        <Button variant="outline" onClick={() => setSelectedId(null)}>
                                            {t('common.cancel')}
                                        </Button>
                                    </div>
                                    {selected && (
                                        <ConfirmButton
                                            message={t('map.confirm_delete')}
                                            onConfirm={() =>
                                                router.delete(`/admin/map/markers/${selected.id}`, {
                                                    preserveScroll: true,
                                                    onSuccess: () => setSelectedId(null),
                                                })
                                            }
                                        >
                                            {t('common.delete')}
                                        </ConfirmButton>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    )}
                    <Panel title={`${markers.length} markers`}>
                        <ul className="max-h-80 space-y-0.5 overflow-y-auto text-sm">
                            {markers.map((m) => (
                                <li key={m.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(m.id)}
                                        className={cn(
                                            'hover:bg-muted flex min-h-9 w-full items-center gap-2 rounded px-2 text-left',
                                            selectedId === m.id && 'bg-muted',
                                        )}
                                    >
                                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[m.category] }} />
                                        <span className="flex-1 truncate">{m.entry_title}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {m.status === 'draft' ? t('status.draft') : m.precision}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                </div>
            </div>
        </AdminLayout>
    );
}

import { AtlasMap, CATEGORY_COLORS, type AtlasMapHandle } from '@/components/map/atlas-map';
import { ProgressToggle } from '@/components/site/favorite-button';
import { MediaFrame } from '@/components/site/media-frame';
import { VerificationBadge } from '@/components/site/verification-badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAtlas } from '@/hooks/use-atlas';
import { useTracking } from '@/hooks/use-tracking';
import SiteLayout from '@/layouts/site-layout';
import { transition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { AtlasShared, MapMarkerData, UserMarker } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Info, Layers, Link2, MapPinPlus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Props extends AtlasShared {
    markers: MapMarkerData[];
    categories: string[];
    focus: number | null;
}

export default function MapPage() {
    return (
        <SiteLayout hideFooter>
            <MapPageContent />
        </SiteLayout>
    );
}

function MapPageContent() {
    const { markers, categories, focus } = usePage<Props>().props;
    const { t, site } = useAtlas();
    const { progress, markers: userMarkers, addMarker, removeMarker } = useTracking();
    const reduced = useReducedMotion();
    const mapRef = useRef<AtlasMapHandle>(null);
    const available = useMemo(() => categories.filter((c) => markers.some((m) => m.category === c)), [categories, markers]);
    const [layers, setLayers] = useState<Set<string>>(() => new Set(available));
    const [selected, setSelected] = useState<MapMarkerData | null>(null);
    const [query, setQuery] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserMarker | null>(null);

    const visible = markers.filter((m) => layers.has(m.category));
    const regions = markers.filter((m) => m.category === 'region');
    const matches =
        query.trim().length >= 2
            ? markers.filter((m) => m.entry.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 8)
            : [];
    const trackable = markers.filter((m) => m.entry.trackable);
    const foundCount = trackable.filter((m) => progress.has(m.entry.id)).length;

    const select = (m: MapMarkerData | null, zoom = true) => {
        setSelected(m);
        setSelectedUser(null);
        const url = new URL(window.location.href);
        if (m) url.searchParams.set('marker', String(m.id));
        else url.searchParams.delete('marker');
        window.history.replaceState(window.history.state, '', url);
        if (m && zoom) mapRef.current?.focus(m.x, m.y, Math.max(m.zoom, 2.2));
    };

    useEffect(() => {
        if (!focus) return;
        const m = markers.find((x) => x.id === focus);
        if (m) {
            const timer = setTimeout(() => select(m), 350);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focus]);

    const toggleLayer = (c: string) =>
        setLayers((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c);
            else next.add(c);
            return next;
        });

    const copyLink = async () => {
        await navigator.clipboard.writeText(window.location.href).then(
            () => toast.success(t('entry.copied')),
            () => toast.error(t('common.error')),
        );
    };

    const controls = (
        <div className="space-y-6">
            <div className="relative">
                <Search className="text-subtle absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('map.search_placeholder')}
                    aria-label={t('map.search_placeholder')}
                    className="border-line bg-canvas focus:border-neon min-h-11 w-full rounded-xl border pr-3 pl-9 text-sm outline-none"
                />
                {matches.length > 0 && (
                    <ul className="border-line bg-surface absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border shadow-2xl">
                        {matches.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    className="hover:bg-surface-2 flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm"
                                    onClick={() => {
                                        setLayers((prev) => new Set([...prev, m.category]));
                                        select(m);
                                        setQuery('');
                                        setPanelOpen(false);
                                    }}
                                >
                                    <span className="size-2 rounded-full" style={{ background: CATEGORY_COLORS[m.category] }} />
                                    {m.entry.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <fieldset>
                <div className="mb-3 flex items-center justify-between">
                    <legend className="label-caps text-subtle">{t('map.layers')}</legend>
                    <button
                        type="button"
                        className="text-subtle hover:text-text text-xs"
                        onClick={() => setLayers(layers.size === available.length ? new Set() : new Set(available))}
                    >
                        {layers.size === available.length ? t('map.hide_all') : t('map.show_all')}
                    </button>
                </div>
                <div className="space-y-1">
                    {available.map((c) => {
                        const count = markers.filter((m) => m.category === c).length;
                        return (
                            <label key={c} className="hover:bg-surface-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2">
                                <input
                                    type="checkbox"
                                    checked={layers.has(c)}
                                    onChange={() => toggleLayer(c)}
                                    className="size-4 accent-[var(--color-neon)]"
                                />
                                <span
                                    className="size-3 rounded-full"
                                    style={{ background: CATEGORY_COLORS[c], boxShadow: `0 0 10px ${CATEGORY_COLORS[c]}` }}
                                    aria-hidden
                                />
                                <span className="flex-1 text-sm">{t(`marker.${c}`)}</span>
                                <span className="tabular text-subtle text-xs">{count}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <div>
                <p className="label-caps text-subtle mb-3">{t('map.regions')}</p>
                <div className="flex flex-wrap gap-2">
                    {regions.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                                select(r);
                                setPanelOpen(false);
                            }}
                            className={cn(
                                'min-h-9 rounded-full border px-3 text-xs font-medium',
                                selected?.id === r.id ? 'border-neon text-neon' : 'border-line hover:border-text/40',
                            )}
                        >
                            {r.entry.title}
                        </button>
                    ))}
                </div>
            </div>

            <div className="border-line space-y-3 rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                    <p className="label-caps text-subtle">{t('map.my_markers')}</p>
                    <span className="tabular text-subtle text-xs">{t('map.found_count', { found: foundCount, total: trackable.length })}</span>
                </div>
                {site.features.user_markers !== false && (
                    <button
                        type="button"
                        onClick={() => {
                            setPlacing((v) => !v);
                            setPanelOpen(false);
                        }}
                        aria-pressed={placing}
                        className={cn(
                            'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold',
                            placing ? 'bg-electric text-ink' : 'bg-surface-2 hover:text-electric',
                        )}
                    >
                        <MapPinPlus className="size-4" /> {placing ? t('map.cancel') : t('map.add_marker')}
                    </button>
                )}
                {userMarkers.length > 0 && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                        {userMarkers.map((m) => (
                            <li key={m.id} className="flex items-center gap-2 text-sm">
                                <button
                                    type="button"
                                    className="hover:text-electric min-h-9 flex-1 truncate text-left"
                                    onClick={() => mapRef.current?.focus(m.x, m.y, 3)}
                                >
                                    {m.label}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void removeMarker(m.id)}
                                    className="touch-target text-subtle hover:text-alert inline-flex items-center justify-center"
                                    aria-label={`${t('map.delete')}: ${m.label}`}
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-subtle flex gap-2 text-xs leading-relaxed">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {t('map.schematic_notice')}
            </p>
        </div>
    );

    return (
        <>
            <h1 className="sr-only">{t('map.title')}</h1>
            <div className="relative flex h-[100svh] pt-16 md:pt-[72px]">
                <aside
                    className="border-line bg-surface/60 hidden w-80 shrink-0 overflow-y-auto border-r p-5 lg:block xl:w-96"
                    aria-label={t('map.layers')}
                >
                    <h2 className="font-display text-3xl uppercase">{t('map.title')}</h2>
                    <p className="text-subtle mt-2 mb-6 text-sm leading-relaxed">{t('map.intro')}</p>
                    {controls}
                </aside>

                <div className="relative min-w-0 flex-1">
                    <AtlasMap
                        ref={mapRef}
                        markers={visible}
                        userMarkers={userMarkers}
                        selectedId={selected?.id}
                        foundIds={progress}
                        onSelect={(m) => select(m, false)}
                        onSelectUserMarker={(m) => {
                            setSelected(null);
                            setSelectedUser(m);
                        }}
                        placing={placing}
                        onPlace={(x, y) => {
                            setPlacing(false);
                            setDraft({ x, y });
                        }}
                        labels={{
                            zoomIn: t('map.zoom_in'),
                            zoomOut: t('map.zoom_out'),
                            reset: t('map.reset'),
                            keyboard: t('map.keyboard_hint'),
                            approximate: t('map.approximate'),
                            mapLabel: t('map.title'),
                        }}
                    />

                    {placing && (
                        <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
                            <p className="bg-electric text-ink rounded-full px-4 py-2 text-sm font-semibold shadow-lg">{t('map.add_marker_hint')}</p>
                        </div>
                    )}
                    {visible.length === 0 && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                            <p className="bg-ink/80 text-paper rounded-2xl px-5 py-3 text-sm backdrop-blur">{t('map.empty_filtered')}</p>
                        </div>
                    )}

                    <div className="absolute top-3 left-3 z-30 flex gap-2 lg:hidden">
                        <button
                            type="button"
                            onClick={() => setPanelOpen(true)}
                            className="bg-ink/85 text-paper inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg backdrop-blur"
                            aria-expanded={panelOpen}
                        >
                            <Layers className="size-4" /> {t('map.layers')}
                        </button>
                    </div>

                    <AnimatePresence>
                        {(selected || selectedUser) && (
                            <motion.section
                                key={selected ? `m${selected.id}` : `u${selectedUser!.id}`}
                                aria-label={selected?.entry.title ?? selectedUser?.label}
                                className="safe-pb border-line bg-surface/95 absolute inset-x-0 bottom-0 z-40 max-h-[62svh] overflow-y-auto rounded-t-3xl border-t p-5 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-[380px] sm:rounded-3xl sm:border"
                                initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
                                transition={transition.panel}
                            >
                                <div className="bg-line mx-auto mb-3 h-1 w-10 rounded-full sm:hidden" aria-hidden />
                                <button
                                    type="button"
                                    onClick={() => (selected ? select(null) : setSelectedUser(null))}
                                    className="touch-target hover:bg-surface-2 absolute top-3 right-3 inline-flex items-center justify-center rounded-full"
                                    aria-label={t('map.close_panel')}
                                >
                                    <X className="size-5" />
                                </button>
                                {selected ? (
                                    <div>
                                        <MediaFrame
                                            media={selected.entry.hero}
                                            still={selected.entry.still}
                                            art={selected.entry.art}
                                            type={selected.entry.type}
                                            label={selected.entry.title}
                                            className="mb-4 aspect-[16/9] rounded-2xl"
                                        />
                                        <p className="label-caps text-subtle flex items-center gap-2">
                                            <span className="size-2 rounded-full" style={{ background: CATEGORY_COLORS[selected.category] }} />
                                            {t(`marker.${selected.category}`)}
                                        </p>
                                        <h2 className="font-display mt-1 pr-10 text-3xl leading-none uppercase">{selected.entry.title}</h2>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <VerificationBadge status={selected.entry.verification} size="xs" />
                                            <span
                                                className={cn(
                                                    'label-caps rounded-full px-2 py-0.5 text-[9px]',
                                                    selected.precision === 'approximate' ? 'bg-sunset/15 text-sunset' : 'bg-mint/15 text-mint',
                                                )}
                                            >
                                                {selected.precision === 'approximate' ? t('map.approximate') : t('map.confirmed')}
                                            </span>
                                        </div>
                                        {selected.entry.summary && (
                                            <p className="text-subtle mt-4 text-sm leading-relaxed">{selected.entry.summary}</p>
                                        )}
                                        {selected.basis && (
                                            <p className="bg-surface-2 mt-4 rounded-xl p-3 text-xs leading-relaxed">
                                                <span className="font-semibold">{t('map.basis')}:</span> {selected.basis}
                                            </p>
                                        )}
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Link
                                                href={selected.entry.url}
                                                className="bg-neon text-ink inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                                            >
                                                {t('map.view_entry')} <ArrowRight className="size-4" />
                                            </Link>
                                            {selected.entry.trackable && <ProgressToggle entryId={selected.entry.id} />}
                                            <button
                                                type="button"
                                                onClick={copyLink}
                                                className="touch-target border-line inline-flex items-center justify-center rounded-full border"
                                                aria-label={t('map.share')}
                                            >
                                                <Link2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    selectedUser && (
                                        <div>
                                            <p className="label-caps text-electric">{t('map.my_markers')}</p>
                                            <h2 className="font-display mt-1 pr-10 text-3xl uppercase">{selectedUser.label}</h2>
                                            {selectedUser.note && <p className="text-subtle mt-3 text-sm">{selectedUser.note}</p>}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    void removeMarker(selectedUser.id);
                                                    setSelectedUser(null);
                                                }}
                                                className="border-line hover:border-alert hover:text-alert mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm"
                                            >
                                                <Trash2 className="size-4" /> {t('map.delete')}
                                            </button>
                                        </div>
                                    )
                                )}
                            </motion.section>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {panelOpen && (
                        <>
                            <motion.div
                                className="bg-ink/60 fixed inset-0 z-[55] lg:hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setPanelOpen(false)}
                            />
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-label={t('map.layers')}
                                className="safe-pb border-line bg-surface fixed inset-x-0 bottom-0 z-[56] max-h-[80svh] overflow-y-auto rounded-t-3xl border-t p-5 lg:hidden"
                                initial={reduced ? { opacity: 0 } : { y: '100%' }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={reduced ? { opacity: 0 } : { y: '100%' }}
                                transition={transition.panel}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-display text-2xl uppercase">{t('map.title')}</h2>
                                    <button
                                        type="button"
                                        onClick={() => setPanelOpen(false)}
                                        className="touch-target hover:bg-surface-2 inline-flex items-center justify-center rounded-full"
                                        aria-label={t('common.close')}
                                    >
                                        <X className="size-5" />
                                    </button>
                                </div>
                                {controls}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            <MarkerDialog
                draft={draft}
                onClose={() => setDraft(null)}
                onSave={(label, note) => draft && void addMarker({ x: draft.x, y: draft.y, label, note, color: 'blue' }).then(() => setDraft(null))}
            />
        </>
    );
}

function MarkerDialog({
    draft,
    onClose,
    onSave,
}: {
    draft: { x: number; y: number } | null;
    onClose: () => void;
    onSave: (label: string, note: string) => void;
}) {
    const { t } = useAtlas();
    const [label, setLabel] = useState('');
    const [note, setNote] = useState('');
    useEffect(() => {
        if (draft) {
            setLabel(t('map.my_marker_default'));
            setNote('');
        }
    }, [draft, t]);
    return (
        <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-line bg-surface w-[calc(100vw-2rem)] max-w-md">
                <DialogTitle className="font-display text-2xl uppercase">{t('map.add_marker')}</DialogTitle>
                <DialogDescription className="sr-only">{t('map.add_marker_hint')}</DialogDescription>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (label.trim()) onSave(label.trim().slice(0, 80), note.trim().slice(0, 500));
                    }}
                >
                    <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">{t('map.marker_label')}</span>
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            maxLength={80}
                            required
                            className="border-line bg-canvas focus:border-electric min-h-11 w-full rounded-xl border px-3 outline-none"
                            autoFocus
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1.5 block font-medium">{t('map.marker_note')}</span>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            className="border-line bg-canvas focus:border-electric w-full rounded-xl border px-3 py-2 outline-none"
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="min-h-11 rounded-full px-4 text-sm">
                            {t('map.cancel')}
                        </button>
                        <button type="submit" className="bg-electric text-ink min-h-11 rounded-full px-5 text-sm font-semibold">
                            {t('map.save')}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

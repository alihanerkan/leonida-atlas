import { cn } from '@/lib/utils';
import type { MapMarkerData, UserMarker } from '@/types/atlas';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { LeonidaMapArt } from './leonida-map';

export const CATEGORY_COLORS: Record<string, string> = {
    region: '#f5efe6',
    landmark: '#ff2e88',
    business: '#ff8a3d',
    mission: '#8d62ff',
    vehicle: '#34b6ff',
    mystery: '#ff5b5b',
    wildlife: '#6ff2c1',
    activity: '#ffd27a',
    collectible: '#c9a0ff',
};

export interface AtlasMapHandle {
    focus: (x: number, y: number, scale?: number) => void;
    reset: () => void;
}

interface Props {
    markers: MapMarkerData[];
    userMarkers?: UserMarker[];
    selectedId?: number | null;
    foundIds?: Set<number>;
    onSelect?: (marker: MapMarkerData | null) => void;
    onSelectUserMarker?: (marker: UserMarker) => void;
    placing?: boolean;
    onPlace?: (x: number, y: number) => void;
    interactive?: boolean;
    showLabels?: boolean;
    className?: string;
    labels: { zoomIn: string; zoomOut: string; reset: string; keyboard: string; approximate: string; mapLabel: string };
}

const MIN = 1;
const MAX = 7;

/**
 * Image-based atlas renderer. Markers are positioned with normalised coordinates (0–1)
 * so they stay correct at any rendered size; their visual size is counter-scaled to stay constant while zooming.
 */
export const AtlasMap = forwardRef<AtlasMapHandle, Props>(function AtlasMap(
    {
        markers,
        userMarkers = [],
        selectedId,
        foundIds,
        onSelect,
        onSelectUserMarker,
        placing,
        onPlace,
        interactive = true,
        showLabels = true,
        className,
        labels,
    },
    ref,
) {
    const apiRef = useRef<ReactZoomPanPinchRef>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [scale, setScale] = useState(1);
    const moved = useRef(false);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // The square canvas always covers the viewport so there is never empty space around the map.
    const canvas = interactive ? Math.max(size.w, size.h) : Math.min(size.w, size.h);

    const focus = useCallback(
        (x: number, y: number, s = 3) => {
            const api = apiRef.current;
            if (!api || !canvas) return;
            const target = Math.min(MAX, Math.max(MIN, s));
            api.setTransform(size.w / 2 - x * canvas * target, size.h / 2 - y * canvas * target, target, 600, 'easeOutCubic');
        },
        [canvas, size.w, size.h],
    );

    // Default view centres on the landmass (not the canvas centre) so narrow portrait screens still see the coast.
    const home = useMemo(() => {
        const clamp = (v: number, min: number) => Math.min(0, Math.max(min, v));
        return { x: clamp(size.w / 2 - 0.66 * canvas, size.w - canvas), y: clamp(size.h / 2 - 0.55 * canvas, size.h - canvas) };
    }, [canvas, size.w, size.h]);

    const reset = useCallback(() => {
        apiRef.current?.setTransform(home.x, home.y, 1, 500, 'easeOutCubic');
    }, [home]);

    useImperativeHandle(ref, () => ({ focus, reset }), [focus, reset]);

    useEffect(() => {
        if (canvas) apiRef.current?.setTransform(home.x, home.y, 1, 0);
        // Only re-centre when the viewport size changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvas]);

    // Grid clustering: markers closer than a screen-space threshold merge into a counted bubble.
    const clusters = useMemo(() => {
        if (!canvas) return [];
        const cell = 46 / (canvas * scale);
        const buckets = new Map<string, MapMarkerData[]>();
        for (const m of markers) {
            const k = scale >= 4.5 ? `m${m.id}` : `${Math.floor(m.x / cell)}:${Math.floor(m.y / cell)}`;
            const list = buckets.get(k) ?? [];
            list.push(m);
            buckets.set(k, list);
        }
        return [...buckets.values()].map((items) => ({
            items,
            x: items.reduce((a, m) => a + m.x, 0) / items.length,
            y: items.reduce((a, m) => a + m.y, 0) / items.length,
        }));
    }, [markers, canvas, scale]);

    const handleCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
        if (moved.current) return;
        if (placing && onPlace && contentRef.current) {
            const rect = contentRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            if (x >= 0 && x <= 1 && y >= 0 && y <= 1) onPlace(Number(x.toFixed(5)), Number(y.toFixed(5)));
            return;
        }
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('svg')) onSelect?.(null);
    };

    const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const api = apiRef.current;
        if (!api || e.target !== e.currentTarget) return;
        const { positionX, positionY, scale: s } = api.state;
        const step = 80;
        const map: Record<string, () => void> = {
            ArrowLeft: () => api.setTransform(positionX + step, positionY, s, 150),
            ArrowRight: () => api.setTransform(positionX - step, positionY, s, 150),
            ArrowUp: () => api.setTransform(positionX, positionY + step, s, 150),
            ArrowDown: () => api.setTransform(positionX, positionY - step, s, 150),
            '+': () => api.zoomIn(0.4),
            '=': () => api.zoomIn(0.4),
            '-': () => api.zoomOut(0.4),
            '0': () => reset(),
        };
        if (map[e.key]) {
            e.preventDefault();
            map[e.key]();
        }
    };

    const inv = 1 / scale;

    return (
        <div
            ref={wrapperRef}
            className={cn('relative h-full w-full overflow-hidden bg-[#060812] outline-none', placing && 'cursor-crosshair', className)}
            tabIndex={interactive ? 0 : -1}
            role="application"
            aria-label={labels.mapLabel}
            aria-roledescription="map"
            onKeyDown={interactive ? handleKey : undefined}
        >
            {canvas > 0 && (
                // Absolute layer: the canvas can never feed back into the measured wrapper size.
                <div className="absolute inset-0">
                    <TransformWrapper
                        ref={apiRef}
                        minScale={MIN}
                        maxScale={MAX}
                        initialScale={1}
                        initialPositionX={home.x}
                        initialPositionY={home.y}
                        limitToBounds
                        disabled={!interactive}
                        wheel={{ step: 0.18 }}
                        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
                        panning={{ velocityDisabled: false }}
                        onTransform={(_, s) => setScale(s.scale)}
                        onPanningStart={() => (moved.current = false)}
                        onPanning={() => (moved.current = true)}
                        onPanningStop={() => setTimeout(() => (moved.current = false), 30)}
                    >
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: canvas, height: canvas }}>
                            <div ref={contentRef} className="relative" style={{ width: canvas, height: canvas }} onClick={handleCanvasClick}>
                                <LeonidaMapArt className="absolute inset-0 h-full w-full" />

                                {clusters.map((c) =>
                                    c.items.length > 1 ? (
                                        <button
                                            key={c.items.map((i) => i.id).join('-')}
                                            type="button"
                                            className="bg-ink/85 text-paper hover:border-neon absolute z-10 flex size-9 items-center justify-center rounded-full border border-white/30 text-xs font-bold shadow-lg backdrop-blur transition-colors"
                                            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: `translate(-50%, -50%) scale(${inv})` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                focus(c.x, c.y, Math.min(MAX, scale * 2.4));
                                            }}
                                            aria-label={c.items.map((i) => i.entry.title).join(', ')}
                                        >
                                            {c.items.length}
                                        </button>
                                    ) : (
                                        <MarkerPin
                                            key={c.items[0].id}
                                            marker={c.items[0]}
                                            inv={inv}
                                            selected={selectedId === c.items[0].id}
                                            found={foundIds?.has(c.items[0].entry.id) ?? false}
                                            showLabel={
                                                showLabels && (c.items[0].category === 'region' || scale >= 2.5 || selectedId === c.items[0].id)
                                            }
                                            approximateLabel={labels.approximate}
                                            onClick={() => {
                                                if (moved.current) return;
                                                onSelect?.(c.items[0]);
                                            }}
                                        />
                                    ),
                                )}

                                {userMarkers.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className="absolute z-20 flex flex-col items-center"
                                        style={{
                                            left: `${m.x * 100}%`,
                                            top: `${m.y * 100}%`,
                                            transform: `translate(-50%, -100%) scale(${inv})`,
                                            transformOrigin: '50% 100%',
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectUserMarker?.(m);
                                        }}
                                        aria-label={m.label}
                                    >
                                        <span className="bg-electric text-ink max-w-32 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold">
                                            {m.label}
                                        </span>
                                        <span className="bg-electric h-3 w-0.5" />
                                        <span className="bg-electric ring-ink size-2 rounded-full ring-2" />
                                    </button>
                                ))}
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
                </div>
            )}

            {interactive && (
                <div className="bg-ink/80 absolute right-3 bottom-3 z-30 flex flex-col overflow-hidden rounded-xl border border-white/10 backdrop-blur sm:right-4 sm:bottom-4">
                    <button
                        type="button"
                        className="touch-target text-paper flex items-center justify-center hover:bg-white/10"
                        onClick={() => apiRef.current?.zoomIn(0.5)}
                        aria-label={labels.zoomIn}
                    >
                        <Plus className="size-5" />
                    </button>
                    <button
                        type="button"
                        className="touch-target text-paper flex items-center justify-center border-y border-white/10 hover:bg-white/10"
                        onClick={() => apiRef.current?.zoomOut(0.5)}
                        aria-label={labels.zoomOut}
                    >
                        <Minus className="size-5" />
                    </button>
                    <button
                        type="button"
                        className="touch-target text-paper flex items-center justify-center hover:bg-white/10"
                        onClick={reset}
                        aria-label={labels.reset}
                    >
                        <RotateCcw className="size-4" />
                    </button>
                </div>
            )}
            <p className="sr-only">{labels.keyboard}</p>
        </div>
    );
});

function MarkerPin({
    marker,
    inv,
    selected,
    found,
    showLabel,
    approximateLabel,
    onClick,
}: {
    marker: MapMarkerData;
    inv: number;
    selected: boolean;
    found: boolean;
    showLabel: boolean;
    approximateLabel: string;
    onClick: () => void;
}) {
    const color = CATEGORY_COLORS[marker.category] ?? '#ff2e88';
    const isRegion = marker.category === 'region';

    return (
        <button
            type="button"
            data-marker={marker.id}
            className="group absolute z-10 flex items-center gap-2 focus-visible:outline-none"
            style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%`, transform: `translate(-50%, -50%) scale(${inv})` }}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            aria-pressed={selected}
            aria-label={`${marker.entry.title}${marker.precision === 'approximate' ? ` (${approximateLabel})` : ''}`}
        >
            <span className="relative flex size-11 items-center justify-center">
                {(selected || isRegion) && (
                    <span
                        className="animate-marker-pulse absolute inset-1 rounded-full"
                        style={{ background: color, opacity: selected ? 0.5 : 0.25 }}
                    />
                )}
                {marker.precision === 'approximate' && (
                    <span className="absolute inset-1.5 rounded-full border border-dashed" style={{ borderColor: color, opacity: 0.7 }} />
                )}
                <span
                    className={cn(
                        'ring-ink group-focus-visible:ring-paper relative rounded-full ring-2 transition-transform duration-300 group-hover:scale-125 group-focus-visible:scale-125',
                        isRegion ? 'size-4' : 'size-3',
                        selected && 'scale-150',
                    )}
                    style={{ background: color, boxShadow: `0 0 14px ${color}` }}
                />
                {found && <span className="bg-mint ring-ink absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2" />}
            </span>
            {showLabel && (
                <span
                    className={cn(
                        'text-paper pointer-events-none -ml-2 rounded px-1.5 py-0.5 text-left whitespace-nowrap shadow',
                        isRegion ? 'font-display text-base tracking-wide uppercase' : 'bg-ink/80 text-[11px] font-medium',
                    )}
                    style={isRegion ? { textShadow: '0 2px 10px #000' } : undefined}
                >
                    {marker.entry.title}
                </span>
            )}
        </button>
    );
}

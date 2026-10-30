import { api, storage } from '@/lib/http';
import type { UserMarker } from '@/types/atlas';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const LOCAL_KEY = 'atlas.tracking.v1';

interface LocalState {
    favorites: number[];
    progress: number[];
    markers: UserMarker[];
}

interface TrackingContext {
    ready: boolean;
    signedIn: boolean;
    favorites: Set<number>;
    progress: Set<number>;
    markers: UserMarker[];
    toggleFavorite: (id: number) => Promise<void>;
    toggleProgress: (id: number) => Promise<void>;
    addMarker: (m: Omit<UserMarker, 'id'>) => Promise<void>;
    removeMarker: (id: UserMarker['id']) => Promise<void>;
    pendingLocal: number;
    importLocal: () => Promise<void>;
}

const Ctx = createContext<TrackingContext | null>(null);

const emptyLocal: LocalState = { favorites: [], progress: [], markers: [] };

/**
 * Anonymous visitors keep progress in localStorage. Signed-in users sync with the API.
 * Anonymous data is never merged silently: the user explicitly imports it.
 */
export function TrackingProvider({
    signedIn,
    children,
    messages,
}: {
    signedIn: boolean;
    children: ReactNode;
    messages: { error: string; imported: string };
}) {
    const [ready, setReady] = useState(false);
    const [favorites, setFavorites] = useState<Set<number>>(new Set());
    const [progress, setProgress] = useState<Set<number>>(new Set());
    const [markers, setMarkers] = useState<UserMarker[]>([]);
    const [pendingLocal, setPendingLocal] = useState(0);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    useEffect(() => {
        const local = storage.get<LocalState>(LOCAL_KEY, emptyLocal);
        if (!signedIn) {
            setFavorites(new Set(local.favorites));
            setProgress(new Set(local.progress));
            setMarkers(local.markers);
            setReady(true);
            return;
        }
        setPendingLocal(local.favorites.length + local.progress.length + local.markers.length);
        const controller = new AbortController();
        api<{ favorites: number[]; progress: number[]; markers: UserMarker[] }>('/api/v1/me/state', { signal: controller.signal })
            .then((s) => {
                setFavorites(new Set(s.favorites));
                setProgress(new Set(s.progress));
                setMarkers(s.markers);
            })
            .catch(() => undefined)
            .finally(() => setReady(true));
        return () => controller.abort();
    }, [signedIn]);

    const persistLocal = useCallback((next: Partial<LocalState>) => {
        const current = storage.get<LocalState>(LOCAL_KEY, emptyLocal);
        storage.set(LOCAL_KEY, { ...current, ...next });
    }, []);

    const toggleSet = useCallback(
        async (kind: 'favorites' | 'progress', id: number) => {
            const setter = kind === 'favorites' ? setFavorites : setProgress;
            let nextValues: number[] = [];
            setter((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                nextValues = [...next];
                return next;
            });
            if (!signedIn) {
                persistLocal({ [kind]: nextValues });
                return;
            }
            try {
                await api(`/api/v1/me/${kind === 'favorites' ? 'favorites' : 'progress'}/${id}`, { method: 'POST' });
            } catch {
                // Roll back the optimistic update.
                setter((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                });
                toast.error(messagesRef.current.error);
            }
        },
        [signedIn, persistLocal],
    );

    const addMarker = useCallback(
        async (m: Omit<UserMarker, 'id'>) => {
            if (!signedIn) {
                const marker = { ...m, id: `local-${Date.now()}` };
                setMarkers((prev) => {
                    const next = [marker, ...prev].slice(0, 200);
                    persistLocal({ markers: next });
                    return next;
                });
                return;
            }
            try {
                const res = await api<{ marker: UserMarker }>('/api/v1/me/markers', { method: 'POST', body: m });
                setMarkers((prev) => [res.marker, ...prev]);
            } catch {
                toast.error(messagesRef.current.error);
            }
        },
        [signedIn, persistLocal],
    );

    const removeMarker = useCallback(
        async (id: UserMarker['id']) => {
            setMarkers((prev) => {
                const next = prev.filter((m) => m.id !== id);
                if (!signedIn) persistLocal({ markers: next });
                return next;
            });
            if (signedIn && typeof id === 'number') {
                await api(`/api/v1/me/markers/${id}`, { method: 'DELETE' }).catch(() => toast.error(messagesRef.current.error));
            }
        },
        [signedIn, persistLocal],
    );

    const importLocal = useCallback(async () => {
        const local = storage.get<LocalState>(LOCAL_KEY, emptyLocal);
        try {
            await api('/api/v1/me/import', {
                method: 'POST',
                body: {
                    favorites: local.favorites,
                    progress: local.progress,
                    markers: local.markers.map(({ x, y, label, note }) => ({ x, y, label, note })),
                },
            });
            storage.remove(LOCAL_KEY);
            setPendingLocal(0);
            const s = await api<{ favorites: number[]; progress: number[]; markers: UserMarker[] }>('/api/v1/me/state');
            setFavorites(new Set(s.favorites));
            setProgress(new Set(s.progress));
            setMarkers(s.markers);
            toast.success(messagesRef.current.imported);
        } catch {
            toast.error(messagesRef.current.error);
        }
    }, []);

    const value = useMemo<TrackingContext>(
        () => ({
            ready,
            signedIn,
            favorites,
            progress,
            markers,
            toggleFavorite: (id) => toggleSet('favorites', id),
            toggleProgress: (id) => toggleSet('progress', id),
            addMarker,
            removeMarker,
            pendingLocal,
            importLocal,
        }),
        [ready, signedIn, favorites, progress, markers, toggleSet, addMarker, removeMarker, pendingLocal, importLocal],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTracking(): TrackingContext {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useTracking must be used inside TrackingProvider');
    return ctx;
}

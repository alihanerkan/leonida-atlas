import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAtlas } from '@/hooks/use-atlas';
import { api, storage } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { EntryCard } from '@/types/atlas';
import { router } from '@inertiajs/react';
import { ArrowRight, Clock, CornerDownLeft, Loader2, Search, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MediaFrame } from './media-frame';
import { VerificationBadge } from './verification-badge';

const RECENT_KEY = 'atlas.search.recent';
const SECTION_FILTERS = ['characters', 'locations', 'vehicles', 'easter-eggs', 'news'] as const;

const SearchCtx = createContext<{ open: () => void }>({ open: () => undefined });
export const useSearchPalette = () => useContext(SearchCtx);

export function Highlight({ text, query }: { text: string; query: string }) {
    const q = query.trim();
    if (q.length < 2) return <>{text}</>;
    const idx = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
    if (idx < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark className="bg-neon/25 rounded px-0.5 text-inherit">{text.slice(idx, idx + q.length)}</mark>
            {text.slice(idx + q.length)}
        </>
    );
}

export function SearchPaletteProvider({ children }: { children: ReactNode }) {
    const [isOpen, setOpen] = useState(false);
    const open = useCallback(() => setOpen(true), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const typing = target.closest('input, textarea, select, [contenteditable="true"]');
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <SearchCtx.Provider value={{ open }}>
            {children}
            <SearchPalette open={isOpen} onOpenChange={setOpen} />
        </SearchCtx.Provider>
    );
}

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const { t, locale, url } = useAtlas();
    const [q, setQ] = useState('');
    const [section, setSection] = useState<string | null>(null);
    const [results, setResults] = useState<EntryCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [active, setActive] = useState(0);
    const [recent, setRecent] = useState<string[]>([]);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (open) setRecent(storage.get<string[]>(RECENT_KEY, []));
        else {
            setQ('');
            setResults([]);
            setActive(0);
        }
    }, [open]);

    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        const timer = setTimeout(() => {
            const params = new URLSearchParams({ q: term, locale, limit: '10' });
            if (section) params.set('section', section);
            api<{ data: EntryCard[] }>(`/api/v1/search?${params}`, { signal: controller.signal })
                .then((r) => {
                    setResults(r.data);
                    setActive(0);
                })
                .catch((e) => {
                    if (e?.name !== 'AbortError') setError(true);
                })
                .finally(() => setLoading(false));
        }, 160);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q, section, locale]);

    const remember = useCallback((term: string) => {
        const next = [term, ...storage.get<string[]>(RECENT_KEY, []).filter((r) => r !== term)].slice(0, 6);
        storage.set(RECENT_KEY, next);
    }, []);

    const go = useCallback(
        (entry?: EntryCard) => {
            const term = q.trim();
            if (term.length >= 2) remember(term);
            onOpenChange(false);
            if (entry) router.visit(entry.url);
            else if (term) router.visit(`${url('search')}?${new URLSearchParams({ q: term, ...(section ? { section } : {}) })}`);
        },
        [q, section, remember, onOpenChange, url],
    );

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            go(results[active]);
        }
    };

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const showEmpty = q.trim().length >= 2 && !loading && !error && results.length === 0;
    const activeId = results[active] ? `search-option-${results[active].id}` : undefined;

    const quickLinks = useMemo(() => ['map', 'characters', 'locations', 'vehicles', 'easter-eggs', 'news'] as const, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-line bg-surface/95 top-[8%] max-h-[84vh] w-[calc(100vw-1.5rem)] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 backdrop-blur-xl sm:top-[12%] [&>button]:hidden">
                <DialogTitle className="sr-only">{t('search.title')}</DialogTitle>
                <DialogDescription className="sr-only">{t('search.keyboard_hint')}</DialogDescription>
                <div className="border-line flex items-center gap-3 border-b px-4">
                    {loading ? (
                        <Loader2 className="text-neon size-5 animate-spin" aria-hidden />
                    ) : (
                        <Search className="text-subtle size-5" aria-hidden />
                    )}
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={t('search.placeholder')}
                        className="placeholder:text-subtle h-14 flex-1 bg-transparent text-base outline-none sm:text-lg"
                        role="combobox"
                        aria-expanded={results.length > 0}
                        aria-controls="search-results"
                        aria-activedescendant={activeId}
                        aria-autocomplete="list"
                        maxLength={100}
                    />
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="touch-target text-subtle hover:text-text -mr-2 inline-flex items-center justify-center rounded-full"
                        aria-label={t('common.close')}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="no-scrollbar border-line flex gap-2 overflow-x-auto border-b px-4 py-2.5">
                    <button
                        type="button"
                        onClick={() => setSection(null)}
                        className={cn(
                            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                            !section ? 'bg-neon text-ink' : 'bg-surface-2 text-subtle hover:text-text',
                        )}
                    >
                        {t('search.all_sections')}
                    </button>
                    {SECTION_FILTERS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setSection(s)}
                            className={cn(
                                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                                section === s ? 'bg-neon text-ink' : 'bg-surface-2 text-subtle hover:text-text',
                            )}
                        >
                            {t(`nav.${s}`)}
                        </button>
                    ))}
                </div>

                <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
                    {results.length > 0 && (
                        <ul id="search-results" role="listbox" ref={listRef} aria-label={t('search.title')}>
                            {results.map((r, i) => (
                                <li key={r.id} id={`search-option-${r.id}`} role="option" aria-selected={i === active} data-index={i}>
                                    <button
                                        type="button"
                                        onMouseEnter={() => setActive(i)}
                                        onClick={() => go(r)}
                                        className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-left', i === active ? 'bg-surface-2' : '')}
                                    >
                                        <MediaFrame
                                            media={r.hero}
                                            still={r.still}
                                            art={r.art}
                                            type={r.type}
                                            label={r.title}
                                            className="size-12 shrink-0 rounded-lg"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold">
                                                <Highlight text={r.title} query={q} />
                                            </span>
                                            <span className="text-subtle block truncate text-xs">
                                                {t(`types.${r.type}`)}
                                                {r.summary ? ' · ' : ''}
                                                {r.summary && <Highlight text={r.summary} query={q} />}
                                            </span>
                                        </span>
                                        <VerificationBadge status={r.verification} size="xs" className="hidden sm:inline-flex" />
                                        {i === active && <CornerDownLeft className="text-subtle size-4" aria-hidden />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {showEmpty && (
                        <div className="px-4 py-10 text-center">
                            <p className="font-semibold">{t('search.no_results', { q: q.trim() })}</p>
                            <p className="text-subtle mt-1 text-sm">{t('search.no_results_hint')}</p>
                        </div>
                    )}
                    {error && <p className="text-alert px-4 py-10 text-center text-sm">{t('common.error')}</p>}

                    {q.trim().length < 2 && (
                        <div className="space-y-5 p-3">
                            {recent.length > 0 && (
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="label-caps text-subtle">{t('search.recent')}</p>
                                        <button
                                            type="button"
                                            className="text-subtle hover:text-text text-xs"
                                            onClick={() => {
                                                storage.remove(RECENT_KEY);
                                                setRecent([]);
                                            }}
                                        >
                                            {t('search.clear_recent')}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recent.map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setQ(r)}
                                                className="bg-surface-2 hover:text-neon inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm"
                                            >
                                                <Clock className="size-3.5" aria-hidden /> {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="label-caps text-subtle mb-2">{t('search.suggestions')}</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {quickLinks.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                onOpenChange(false);
                                                router.visit(url(s));
                                            }}
                                            className="bg-surface-2 hover:text-neon flex min-h-11 items-center justify-between rounded-xl px-3 text-left text-sm font-medium"
                                        >
                                            {t(`nav.${s}`)} <ArrowRight className="size-3.5" aria-hidden />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="border-line text-subtle hidden border-t px-4 py-2.5 text-xs sm:block">{t('search.keyboard_hint')}</div>
            </DialogContent>
        </Dialog>
    );
}

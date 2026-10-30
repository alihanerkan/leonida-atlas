import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAtlas } from '@/hooks/use-atlas';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { SectionKey } from '@/types/atlas';
import { Link, router } from '@inertiajs/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowUpRight, ChevronDown, Heart, LogIn, Menu, Search, Shield, User, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { BrandWordmark } from './brand-mark';
import { LanguageSwitcher, switchLocale, useLocaleTargets } from './language-switcher';
import { useSearchPalette } from './search-palette';

const PRIMARY: SectionKey[] = ['map', 'characters', 'vehicles', 'locations'];
const COLUMNS: { title: string; items: SectionKey[] }[] = [
    { title: 'nav.col_encyclopedia', items: ['characters', 'vehicles', 'locations', 'weapons', 'wildlife'] },
    { title: 'nav.col_story', items: ['missions', 'easter-eggs', 'world', 'collectibles', 'news'] },
    { title: 'nav.col_tools', items: ['map', 'compare', 'search', 'tracker', 'contribute', 'sources'] },
];
const EXPLORABLE = COLUMNS.flatMap((c) => c.items);

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
    const { t, url, site, user, can, page } = useAtlas();
    const { open: openSearch } = useSearchPalette();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [exploreOpen, setExploreOpen] = useState(false);
    const panelId = useId();
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 16);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(
        () =>
            router.on('navigate', () => {
                setMenuOpen(false);
                setExploreOpen(false);
            }),
        [],
    );

    useEffect(() => {
        if (!exploreOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExploreOpen(false);
        const onClick = (e: MouseEvent) => !wrapRef.current?.contains(e.target as Node) && setExploreOpen(false);
        window.addEventListener('keydown', onKey);
        window.addEventListener('mousedown', onClick);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('mousedown', onClick);
        };
    }, [exploreOpen]);

    const current = page.url.split('?')[0];
    const isActive = (s: SectionKey) => current.startsWith(url(s));
    const solid = !overlay || scrolled || exploreOpen;

    return (
        <header ref={wrapRef} className="fixed inset-x-0 top-0 z-50">
            <a href="#main" className="bg-neon text-ink sr-only z-50 rounded px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3">
                {t('nav.skip')}
            </a>
            <div
                className={cn(
                    'transition-colors duration-300',
                    solid ? 'bg-canvas/92 border-line border-b backdrop-blur-md' : 'border-b border-transparent bg-transparent',
                )}
            >
                <div className="safe-px mx-auto flex h-14 max-w-[1440px] items-center gap-3 lg:h-16 lg:px-6">
                    <Link href={url()} className="shrink-0" aria-label={site.name}>
                        <BrandWordmark name={site.name} className="[&_span:last-child]:text-lg" />
                    </Link>

                    <nav aria-label={t('nav.main_navigation')} className="hidden flex-1 items-center justify-center lg:flex">
                        <ul className="border-line flex items-center rounded-full border p-1">
                            {PRIMARY.map((s) => (
                                <li key={s}>
                                    <Link
                                        href={url(s)}
                                        aria-current={isActive(s) ? 'page' : undefined}
                                        className={cn(
                                            'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors',
                                            isActive(s) ? 'bg-paper text-ink' : 'text-text/75 hover:text-text',
                                        )}
                                    >
                                        {t(`nav.${s}`)}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <button
                                    type="button"
                                    onClick={() => setExploreOpen((v) => !v)}
                                    aria-expanded={exploreOpen}
                                    aria-controls={panelId}
                                    className={cn(
                                        'inline-flex h-9 items-center gap-2 rounded-full pr-3 pl-4 text-[13px] font-semibold transition-colors',
                                        exploreOpen ? 'vi-gradient text-ink' : 'text-text hover:bg-surface-2',
                                    )}
                                >
                                    {t('nav.explore_all')}
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 text-[10px] leading-4 tabular-nums',
                                            exploreOpen ? 'bg-ink/15' : 'bg-surface-2 text-subtle',
                                        )}
                                    >
                                        {EXPLORABLE.length}
                                    </span>
                                    <ChevronDown className={cn('size-3.5 transition-transform', exploreOpen && 'rotate-180')} aria-hidden />
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
                        <button
                            type="button"
                            onClick={openSearch}
                            className="touch-target hover:bg-surface-2 inline-flex items-center justify-center gap-2 rounded-full px-2.5 text-[13px]"
                            aria-label={t('search.open')}
                        >
                            <Search className="size-[18px]" aria-hidden />
                            <kbd className="border-line text-subtle hidden rounded border px-1.5 text-[10px] font-semibold xl:inline">/</kbd>
                        </button>
                        <LanguageSwitcher className="hidden h-9 text-[13px] sm:inline-flex" />
                        <Link
                            href={url('tracker')}
                            className="touch-target hover:bg-surface-2 hidden items-center justify-center rounded-full sm:inline-flex"
                            aria-label={t('nav.tracker')}
                        >
                            <Heart className="size-[18px]" aria-hidden />
                        </Link>
                        {user ? (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger
                                    className="touch-target hidden items-center justify-center rounded-full md:inline-flex"
                                    aria-label={t('nav.account')}
                                >
                                    <span className="vi-gradient text-ink flex size-8 items-center justify-center rounded-full text-[11px] font-bold uppercase">
                                        {user.name.slice(0, 2)}
                                    </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-line bg-surface w-56">
                                    <div className="px-2 py-1.5 text-sm">
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-subtle truncate text-xs">{user.email}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
                                        <Link href={url('tracker')}>{t('nav.tracker')}</Link>
                                    </DropdownMenuItem>
                                    {can('admin.access') && (
                                        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
                                            <a href="/admin">{t('nav.admin')}</a>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
                                        <Link href="/settings/profile">{t('nav.account')}</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
                                        <Link href="/logout" method="post" as="button" className="w-full">
                                            {t('nav.logout')}
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-paper text-ink hover:bg-peach ml-1 hidden h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors md:inline-flex"
                            >
                                <LogIn className="size-3.5" aria-hidden /> {t('nav.login')}
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            className="touch-target hover:bg-surface-2 inline-flex items-center justify-center rounded-full lg:hidden"
                            aria-label={t('nav.menu')}
                            aria-expanded={menuOpen}
                        >
                            <Menu className="size-5" aria-hidden />
                        </button>
                    </div>
                </div>
            </div>
            <ExplorePanel id={panelId} open={exploreOpen} />
            <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
        </header>
    );
}

function ExplorePanel({ id, open }: { id: string; open: boolean }) {
    const { t, url, page, site } = useAtlas();
    const reduced = useReducedMotion();
    const counts = (page.props.sectionCounts ?? {}) as Record<string, number>;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    id={id}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                    transition={{ duration: 0.25, ease: ease.cinema }}
                    className="border-line bg-canvas/98 hidden border-b shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md lg:block"
                >
                    <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_1fr_1fr_18rem] gap-8 px-6 py-8">
                        {COLUMNS.map((col) => (
                            <div key={col.title}>
                                <p className="label-caps text-peach mb-3">{t(col.title)}</p>
                                <ul className="space-y-0.5">
                                    {col.items.map((s) => {
                                        const n = counts[s];
                                        return (
                                            <li key={s}>
                                                <Link
                                                    href={url(s)}
                                                    className="group hover:bg-surface flex items-start justify-between gap-3 rounded-lg px-3 py-2.5"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="group-hover:text-neon block text-sm font-semibold">{t(`nav.${s}`)}</span>
                                                        <span className="text-subtle line-clamp-1 text-xs">
                                                            {t(`sections.${s}.kicker`, { defaultValue: '' }) ||
                                                                t(`meta.${s}_description`, { defaultValue: '' })}
                                                        </span>
                                                    </span>
                                                    {n !== undefined && (
                                                        <span
                                                            className={cn(
                                                                'mt-0.5 shrink-0 rounded-full px-2 text-[10px] leading-5 tabular-nums',
                                                                n > 0 ? 'bg-surface-2 text-text' : 'text-subtle border-line border',
                                                            )}
                                                        >
                                                            {n > 0 ? n : t('nav.soon')}
                                                        </span>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                        <Link
                            href={url('map')}
                            className="group vi-gradient text-ink relative flex flex-col justify-between overflow-hidden rounded-xl p-5"
                        >
                            <PalmShadowInline />
                            <span className="relative">
                                <span className="label-caps text-ink/70">{site.name}</span>
                                <span className="font-display mt-2 block text-3xl leading-none uppercase">{t('nav.map')}</span>
                            </span>
                            <span className="relative inline-flex items-center gap-1 text-sm font-semibold">
                                {t('nav.open_map')}{' '}
                                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                        </Link>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function PalmShadowInline() {
    return <span className="palm-shadow pointer-events-none absolute -top-6 -right-10 size-56 opacity-25" aria-hidden />;
}

function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const { t, url, site, user, can, page } = useAtlas();
    const reduced = useReducedMotion();
    const targets = useLocaleTargets();
    const counts = (page.props.sectionCounts ?? {}) as Record<string, number>;

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
                {open && (
                    <DialogPrimitive.Portal forceMount>
                        <DialogPrimitive.Content forceMount asChild aria-describedby={undefined}>
                            <motion.div
                                className="bg-canvas text-text fixed inset-0 z-[60] flex flex-col overflow-y-auto"
                                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: reduced ? 0 : -12 }}
                                transition={{ duration: 0.3, ease: ease.cinema }}
                            >
                                <DialogPrimitive.Title className="sr-only">{t('nav.menu')}</DialogPrimitive.Title>
                                <div className="safe-px border-line flex h-14 shrink-0 items-center justify-between border-b">
                                    <BrandWordmark name={site.name} />
                                    <DialogPrimitive.Close
                                        className="touch-target hover:bg-surface-2 inline-flex items-center justify-center rounded-full"
                                        aria-label={t('nav.close')}
                                    >
                                        <X className="size-5" />
                                    </DialogPrimitive.Close>
                                </div>
                                <nav className="safe-px flex-1 space-y-7 py-6" aria-label={t('nav.main_navigation')}>
                                    {COLUMNS.map((col, ci) => (
                                        <div key={col.title}>
                                            <p className="label-caps text-peach mb-2">{t(col.title)}</p>
                                            <ul className="divide-line border-line divide-y border-y">
                                                {col.items.map((s, i) => (
                                                    <motion.li
                                                        key={s}
                                                        initial={{ opacity: 0, x: reduced ? 0 : -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: reduced ? 0 : 0.05 + (ci * 5 + i) * 0.025 }}
                                                    >
                                                        <Link href={url(s)} className="flex min-h-12 items-center justify-between gap-3">
                                                            <span className="font-display text-xl tracking-wide uppercase">{t(`nav.${s}`)}</span>
                                                            {counts[s] !== undefined && (
                                                                <span className="text-subtle text-xs tabular-nums">
                                                                    {counts[s] > 0 ? counts[s] : t('nav.soon')}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </nav>
                                <div className="safe-px safe-pb border-line space-y-5 border-t pt-5">
                                    <div className="flex flex-wrap gap-2">
                                        {targets.map((l) => (
                                            <button
                                                key={l.code}
                                                type="button"
                                                lang={l.code}
                                                onClick={() => void switchLocale(l.code, l.href)}
                                                aria-current={l.active ? 'true' : undefined}
                                                className={cn(
                                                    'min-h-11 rounded-full border px-4 text-sm',
                                                    l.active ? 'border-paper bg-paper text-ink' : 'border-line',
                                                )}
                                            >
                                                {l.native}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pb-2">
                                        <Link
                                            href={url('tracker')}
                                            className="bg-surface-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                                        >
                                            <Heart className="size-4" /> {t('nav.tracker')}
                                        </Link>
                                        {user ? (
                                            <>
                                                {can('admin.access') && (
                                                    <a
                                                        href="/admin"
                                                        className="bg-surface-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                                                    >
                                                        <Shield className="size-4" /> {t('nav.admin')}
                                                    </a>
                                                )}
                                                <Link
                                                    href="/logout"
                                                    method="post"
                                                    as="button"
                                                    className="bg-surface-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                                                >
                                                    <User className="size-4" /> {t('nav.logout')}
                                                </Link>
                                            </>
                                        ) : (
                                            <Link
                                                href="/login"
                                                className="bg-paper text-ink inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                                            >
                                                <LogIn className="size-4" /> {t('nav.login')}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </DialogPrimitive.Content>
                    </DialogPrimitive.Portal>
                )}
            </AnimatePresence>
        </DialogPrimitive.Root>
    );
}

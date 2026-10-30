import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAtlas } from '@/hooks/use-atlas';
import { applyLocale } from '@/i18n';
import { localizedPath } from '@/lib/atlas';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Globe } from 'lucide-react';

export function useLocaleTargets() {
    const { locale, locales, sections, page } = useAtlas();
    // Entry pages provide exact per-locale URLs (localized slugs); other pages map their section segment.
    const switcher = page.props.switcher as Record<string, string | null> | undefined;
    const hasSwitcher = !!switcher && Object.keys(switcher).length > 0;
    return locales.map((l) => {
        const href =
            (hasSwitcher && switcher[l.code]) ||
            (typeof window !== 'undefined'
                ? localizedPath(sections, locale, l.code, window.location.pathname, window.location.search)
                : `/${l.code}`);
        return { ...l, href, active: l.code === locale };
    });
}

export async function switchLocale(code: string, href: string) {
    await applyLocale(code);
    router.visit(href, { preserveScroll: false });
}

export function LanguageSwitcher({ className, align = 'end' }: { className?: string; align?: 'start' | 'end' }) {
    const { t, locale, locales } = useAtlas();
    const targets = useLocaleTargets();
    const current = locales.find((l) => l.code === locale);

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger
                className={cn(
                    'touch-target text-text/90 inline-flex items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:bg-white/10',
                    className,
                )}
                aria-label={`${t('nav.language')}: ${current?.native}`}
            >
                <Globe className="size-4" aria-hidden />
                <span className="uppercase">{locale === 'zh-CN' ? '中文' : locale}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="border-line bg-surface/95 w-56 backdrop-blur-xl">
                <DropdownMenuLabel className="label-caps text-subtle">{t('nav.language')}</DropdownMenuLabel>
                {targets.map((l) => (
                    <DropdownMenuItem
                        key={l.code}
                        lang={l.code}
                        className="flex min-h-11 cursor-pointer items-center justify-between gap-3"
                        onSelect={(e) => {
                            e.preventDefault();
                            if (!l.active) void switchLocale(l.code, l.href);
                        }}
                        aria-current={l.active ? 'true' : undefined}
                    >
                        <span>
                            <span className="font-medium">{l.native}</span>
                            <span className="text-subtle ml-2 text-xs">{l.name}</span>
                        </span>
                        {l.active && <Check className="text-neon size-4" aria-hidden />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

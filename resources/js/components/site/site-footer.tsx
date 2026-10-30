import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useAtlas } from '@/hooks/use-atlas';
import { cn } from '@/lib/utils';
import type { SectionKey } from '@/types/atlas';
import { Link } from '@inertiajs/react';
import { BrandWordmark } from './brand-mark';
import { switchLocale, useLocaleTargets } from './language-switcher';

const EXPLORE: SectionKey[] = [
    'map',
    'characters',
    'vehicles',
    'locations',
    'missions',
    'easter-eggs',
    'weapons',
    'collectibles',
    'wildlife',
    'world',
    'news',
];
const PROJECT: SectionKey[] = ['about', 'sources', 'contribute', 'compare', 'tracker', 'legal'];

export function SiteFooter() {
    const { t, url, site } = useAtlas();
    const targets = useLocaleTargets();
    const { appearance, updateAppearance } = useAppearance();
    const year = new Date().getFullYear();

    return (
        <footer className="border-line bg-canvas relative overflow-hidden border-t">
            <div className="safe-px relative mx-auto max-w-[1600px] py-16 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <BrandWordmark name={site.name} />
                        <p className="text-subtle mt-4 max-w-sm">{site.tagline || t('footer.tagline')}</p>
                        <p className="text-subtle/80 mt-6 max-w-md text-xs leading-relaxed">{site.disclaimer || t('footer.disclaimer')}</p>
                    </div>
                    <nav className="lg:col-span-4" aria-label={t('footer.explore')}>
                        <p className="label-caps text-subtle mb-4">{t('footer.explore')}</p>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {EXPLORE.map((s) => (
                                <li key={s}>
                                    <Link href={url(s)} className="hover:text-neon inline-flex min-h-9 items-center text-sm">
                                        {t(`nav.${s}`)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="space-y-8 lg:col-span-4">
                        <nav aria-label={t('footer.project')}>
                            <p className="label-caps text-subtle mb-4">{t('footer.project')}</p>
                            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {PROJECT.map((s) => (
                                    <li key={s}>
                                        <Link href={url(s)} className="hover:text-neon inline-flex min-h-9 items-center text-sm">
                                            {t(`nav.${s}`)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div>
                            <p className="label-caps text-subtle mb-3" id="footer-lang">
                                {t('footer.language')}
                            </p>
                            <ul className="flex flex-wrap gap-1.5" aria-labelledby="footer-lang">
                                {targets.map((l) => (
                                    <li key={l.code}>
                                        <button
                                            type="button"
                                            lang={l.code}
                                            onClick={() => !l.active && void switchLocale(l.code, l.href)}
                                            aria-current={l.active ? 'true' : undefined}
                                            className={cn(
                                                'min-h-9 rounded-full px-3 text-xs font-medium',
                                                l.active ? 'bg-neon text-ink' : 'bg-surface-2 hover:text-neon',
                                            )}
                                        >
                                            {l.native}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div role="radiogroup" aria-label={t('footer.theme')} className="bg-surface-2 inline-flex rounded-full p-1">
                            {(['dark', 'light', 'system'] as Appearance[]).map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    role="radio"
                                    aria-checked={appearance === a}
                                    onClick={() => updateAppearance(a)}
                                    className={cn(
                                        'min-h-9 rounded-full px-3 text-xs font-medium',
                                        appearance === a ? 'bg-canvas text-text shadow' : 'text-subtle hover:text-text',
                                    )}
                                >
                                    {t(`footer.theme_${a}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="border-line text-subtle mt-16 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:justify-between">
                    <p>
                        © {year} {site.name}
                    </p>
                    <p>
                        {t('legal.disclaimer_title')} · {t('nav.legal')}
                    </p>
                </div>
            </div>
        </footer>
    );
}

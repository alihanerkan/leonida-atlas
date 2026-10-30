import { SearchPaletteProvider } from '@/components/site/search-palette';
import { Seo } from '@/components/site/seo';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { useAtlas } from '@/hooks/use-atlas';
import { TrackingProvider } from '@/hooks/use-tracking';
import { applyLocale } from '@/i18n';
import type { AtlasShared } from '@/types/atlas';
import { usePage } from '@inertiajs/react';
import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';

export default function SiteLayout({
    children,
    overlayHeader = false,
    hideFooter = false,
}: {
    children: ReactNode;
    overlayHeader?: boolean;
    hideFooter?: boolean;
}) {
    const { props } = usePage<AtlasShared>();
    const { t, i18n, locale, user } = useAtlas();

    useLayoutEffect(() => {
        if (i18n.language !== locale) void applyLocale(locale);
    }, [locale, i18n]);

    useEffect(() => {
        if (props.flash?.success) toast.success(props.flash.success);
        if (props.flash?.error) toast.error(props.flash.error);
    }, [props.flash]);

    return (
        <TrackingProvider signedIn={!!user} messages={{ error: t('common.error'), imported: t('tracker.imported') }}>
            <SearchPaletteProvider>
                <Seo meta={props.meta} />
                <div className="bg-canvas text-text flex min-h-svh flex-col">
                    <SiteHeader overlay={overlayHeader} />
                    <main id="main" className="flex-1" tabIndex={-1}>
                        {children}
                    </main>
                    {!hideFooter && <SiteFooter />}
                </div>
                <Toaster theme="dark" position="bottom-center" toastOptions={{ className: 'border-line bg-surface text-text' }} />
            </SearchPaletteProvider>
        </TrackingProvider>
    );
}

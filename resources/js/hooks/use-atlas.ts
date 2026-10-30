import { formatDate, formatNumber, intlLocale, sectionUrl } from '@/lib/atlas';
import type { AtlasShared, SectionKey } from '@/types/atlas';
import { usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function useAtlas() {
    const page = usePage<AtlasShared>();
    const { t, i18n } = useTranslation();
    const { locale, sections, locales, site, auth } = page.props;
    const intl = intlLocale(locales, locale);

    const url = useCallback((section?: SectionKey | null, slug?: string | null) => sectionUrl(sections, locale, section, slug), [sections, locale]);
    const date = useCallback((v: string | null | undefined, style: 'long' | 'short' = 'long') => formatDate(v, intl, style), [intl]);
    const num = useCallback((v: number) => formatNumber(v, intl), [intl]);
    const can = useCallback((permission: string) => auth.user?.permissions.includes(permission) ?? false, [auth.user]);

    return useMemo(
        () => ({ t, i18n, locale, intl, sections, locales, site, user: auth.user, url, date, num, can, page }),
        [t, i18n, locale, intl, sections, locales, site, auth.user, url, date, num, can, page],
    );
}

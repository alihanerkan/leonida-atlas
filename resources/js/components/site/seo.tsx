import type { SeoMeta } from '@/types/atlas';
import { Head } from '@inertiajs/react';

/** Keeps the server-rendered meta tags (see app.blade.php) in sync during client-side navigation. */
export function Seo({ meta }: { meta?: SeoMeta }) {
    if (!meta) return null;
    return (
        <Head>
            <title>{meta.title}</title>
            {meta.description && <meta head-key="description" name="description" content={meta.description} />}
            {meta.noindex && <meta head-key="robots" name="robots" content="noindex, follow" />}
            {meta.canonical && <link head-key="canonical" rel="canonical" href={meta.canonical} />}
            {Object.entries(meta.alternates ?? {}).map(([lang, href]) => (
                <link key={lang} head-key={`alt-${lang}`} rel="alternate" hrefLang={lang} href={href} />
            ))}
            {meta.canonical && <meta head-key="og:title" property="og:title" content={meta.title} />}
            {meta.description && <meta head-key="og:description" property="og:description" content={meta.description} />}
            {meta.canonical && <meta head-key="og:url" property="og:url" content={meta.canonical} />}
        </Head>
    );
}

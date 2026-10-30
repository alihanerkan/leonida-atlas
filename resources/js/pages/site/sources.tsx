import { PageHero } from '@/components/site/page-hero';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { hostname } from '@/lib/atlas';
import type { AtlasShared } from '@/types/atlas';
import { usePage } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

interface Source {
    id: number;
    title: string;
    url: string;
    publisher: string | null;
    type: string;
    published_on: string | null;
    accessed_on: string | null;
    entries: number;
}

const ORDER = ['official', 'video', 'press', 'wiki', 'community'];

export default function Sources() {
    const { sources } = usePage<AtlasShared & { sources: Source[] }>().props;
    const { t, date } = useAtlas();
    const groups = ORDER.map((type) => [type, sources.filter((s) => s.type === type)] as const).filter(([, list]) => list.length > 0);
    return (
        <SiteLayout>
            <PageHero kicker={t('nav.sources')} title={t('sources_page.title')} intro={t('sources_page.intro')} art="news" compact />
            <div className="safe-px mx-auto max-w-[1600px] space-y-14 py-14 lg:px-8">
                {groups.map(([type, list]) => (
                    <section key={type} aria-labelledby={`src-${type}`}>
                        <h2 id={`src-${type}`} className="label-caps text-neon mb-5">
                            {t(`sources_page.types.${type}`)} · {list.length}
                        </h2>
                        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {list.map((s) => (
                                <li key={s.id}>
                                    <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="group border-line hover:border-neon/60 flex h-full flex-col rounded-2xl border p-5"
                                    >
                                        <span className="label-caps text-subtle">{s.publisher ?? hostname(s.url)}</span>
                                        <span className="group-hover:text-neon mt-2 flex-1 font-semibold break-words">{s.title}</span>
                                        <span className="text-subtle mt-4 flex items-center justify-between gap-2 text-xs">
                                            <span>
                                                {s.published_on ? date(s.published_on, 'short') : hostname(s.url)} ·{' '}
                                                {t('sources_page.used_by', { count: s.entries })}
                                            </span>
                                            <ArrowUpRight className="size-4" aria-hidden />
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </SiteLayout>
    );
}

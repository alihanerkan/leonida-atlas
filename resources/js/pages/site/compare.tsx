import { MediaFrame } from '@/components/site/media-frame';
import { PageHero } from '@/components/site/page-hero';
import { StatBar } from '@/components/site/stat-bar';
import { VerificationBadge } from '@/components/site/verification-badge';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { ease } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { AtlasShared, EntryCard } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props extends AtlasShared {
    vehicles: EntryCard[];
    selected: number[];
}

const STATS = ['top_speed', 'acceleration', 'braking', 'handling', 'durability'] as const;

export default function Compare() {
    const { vehicles, selected: initial } = usePage<Props>().props;
    const { t } = useAtlas();
    const [ids, setIds] = useState<number[]>(initial.length ? initial : vehicles.slice(0, 2).map((v) => v.id));

    useEffect(() => {
        const url = new URL(window.location.href);
        if (ids.length) url.searchParams.set('ids', ids.join(','));
        else url.searchParams.delete('ids');
        window.history.replaceState(window.history.state, '', url);
    }, [ids]);

    const chosen = ids.map((id) => vehicles.find((v) => v.id === id)).filter(Boolean) as EntryCard[];
    const toggle = (id: number) =>
        setIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 4) {
                toast.error(t('compare.max'));
                return prev;
            }
            return [...prev, id];
        });

    const rows: { key: string; label: string; render: (v: EntryCard) => React.ReactNode }[] = [
        { key: 'manufacturer', label: t('specs.manufacturer'), render: (v) => (v.specs?.manufacturer as string) ?? t('entry.unknown') },
        {
            key: 'class',
            label: t('specs.vehicle_class'),
            render: (v) => (v.specs?.vehicle_class ? t(`vehicle_class.${v.specs.vehicle_class}`) : t('entry.unknown')),
        },
        {
            key: 'inspiration',
            label: t('specs.real_world_inspiration'),
            render: (v) =>
                v.specs?.real_world_inspiration ? (
                    <span className="flex flex-col items-start gap-1">
                        {v.specs.real_world_inspiration}
                        {v.specs.inspiration_verification && <VerificationBadge status={String(v.specs.inspiration_verification)} size="xs" />}
                    </span>
                ) : (
                    t('entry.unknown')
                ),
        },
        { key: 'first_seen', label: t('specs.first_seen'), render: (v) => (v.specs?.first_seen as string) ?? t('entry.unknown') },
        { key: 'verification', label: t('list.verification'), render: (v) => <VerificationBadge status={v.verification} size="xs" /> },
    ];

    return (
        <SiteLayout>
            <PageHero title={t('compare.title')} intro={t('compare.intro')} art="car-sports" compact />
            <div className="safe-px mx-auto max-w-[1600px] py-10 lg:px-8">
                <fieldset>
                    <legend className="label-caps text-subtle mb-3">{t('compare.choose')}</legend>
                    <div className="flex flex-wrap gap-2">
                        {vehicles.map((v) => {
                            const on = ids.includes(v.id);
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggle(v.id)}
                                    className={cn(
                                        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm',
                                        on ? 'border-neon bg-neon/15 text-neon' : 'border-line hover:border-text/40',
                                    )}
                                >
                                    {on ? <X className="size-3.5" /> : <Plus className="size-3.5" />} {v.title}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                {chosen.length === 0 ? (
                    <p className="text-subtle mt-12">{t('compare.empty')}</p>
                ) : (
                    <div className="no-scrollbar -mx-4 mt-10 overflow-x-auto px-4">
                        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                            <caption className="sr-only">{t('compare.title')}</caption>
                            <thead>
                                <tr>
                                    <th scope="col" className="w-40 sm:w-52" />
                                    <AnimatePresence initial={false}>
                                        {chosen.map((v) => (
                                            <motion.th
                                                key={v.id}
                                                scope="col"
                                                className="px-2 pb-4 text-left align-bottom font-normal"
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.5, ease: ease.cinema }}
                                            >
                                                <Link href={v.url} className="group block">
                                                    <MediaFrame
                                                        media={v.hero}
                                                        still={v.still}
                                                        art={v.art}
                                                        type={v.type}
                                                        label={v.title}
                                                        className="aspect-[16/10] rounded-2xl"
                                                    />
                                                    <span className="font-display group-hover:text-neon mt-3 block text-2xl uppercase">
                                                        {v.title}
                                                    </span>
                                                </Link>
                                            </motion.th>
                                        ))}
                                    </AnimatePresence>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.key}>
                                        <th scope="row" className="border-line text-subtle border-t py-4 pr-4 text-left font-medium">
                                            {r.label}
                                        </th>
                                        {chosen.map((v) => (
                                            <td key={v.id} className="border-line border-t px-2 py-4 align-top">
                                                {r.render(v)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {STATS.map((s) => (
                                    <tr key={s}>
                                        <th scope="row" className="border-line text-subtle border-t py-4 pr-4 text-left font-medium">
                                            {t(`specs.${s}`)}
                                        </th>
                                        {chosen.map((v) => (
                                            <td key={v.id} className="border-line border-t px-2 py-4">
                                                <StatBar
                                                    label=""
                                                    value={(v.specs?.[s] as number | null) ?? null}
                                                    unknownLabel={t('compare.stat_unknown')}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-subtle mt-6 text-xs">{t('entry.stats_unknown_note')}</p>
                    </div>
                )}
            </div>
        </SiteLayout>
    );
}

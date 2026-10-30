import { PageHero } from '@/components/site/page-hero';
import { Reveal } from '@/components/site/reveal';
import { VerificationBadge } from '@/components/site/verification-badge';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { VERIFICATION_ORDER } from '@/lib/atlas';
import { Link } from '@inertiajs/react';

export default function About() {
    const { t, url } = useAtlas();
    return (
        <SiteLayout>
            <PageHero kicker={t('nav.about')} title={t('about.title')} intro={t('about.lead')} art="mountains" />
            <div className="safe-px mx-auto grid max-w-[1600px] gap-16 py-16 lg:grid-cols-12 lg:px-8">
                <div className="text-text/90 space-y-6 text-lg leading-relaxed lg:col-span-7">
                    {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => (
                        <Reveal key={p}>
                            <p>{t(`about.${p}`)}</p>
                        </Reveal>
                    ))}
                    <Reveal>
                        <h2 className="font-display mt-10 text-3xl uppercase">{t('about.principles')}</h2>
                        <ol className="mt-6 space-y-4">
                            {(['principle_1', 'principle_2', 'principle_3', 'principle_4'] as const).map((k, i) => (
                                <li key={k} className="flex gap-4">
                                    <span className="font-display text-neon text-3xl leading-none">{i + 1}</span>
                                    <span>{t(`about.${k}`)}</span>
                                </li>
                            ))}
                        </ol>
                    </Reveal>
                    <div className="flex flex-wrap gap-3 pt-6">
                        <Link
                            href={url('sources')}
                            className="bg-neon text-ink inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold"
                        >
                            {t('nav.sources')}
                        </Link>
                        <Link
                            href={url('contribute')}
                            className="border-line inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold"
                        >
                            {t('nav.contribute')}
                        </Link>
                    </div>
                </div>
                <aside className="lg:col-span-5">
                    <div className="border-line rounded-3xl border p-6 lg:sticky lg:top-28">
                        <h2 className="label-caps text-subtle mb-5">{t('about.legend')}</h2>
                        <dl className="space-y-4">
                            {VERIFICATION_ORDER.map((v) => (
                                <div key={v}>
                                    <dt>
                                        <VerificationBadge status={v} />
                                    </dt>
                                    <dd className="text-subtle mt-1.5 text-sm leading-relaxed">{t(`verification_desc.${v}`)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </aside>
            </div>
        </SiteLayout>
    );
}

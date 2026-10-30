import { PageHero } from '@/components/site/page-hero';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';

export default function Legal() {
    const { t, site } = useAtlas();
    const blocks = [
        ['disclaimer_title', site.disclaimer || t('legal.disclaimer')],
        ['trademarks_title', t('legal.trademarks')],
        ['media_title', t('legal.media')],
        ['privacy_title', t('legal.privacy')],
        ['contact_title', t('legal.contact')],
    ] as const;
    return (
        <SiteLayout>
            <PageHero title={t('legal.title')} art="news" compact />
            <div className="safe-px mx-auto max-w-3xl space-y-10 py-16">
                {blocks.map(([title, body]) => (
                    <section key={title}>
                        <h2 className="font-display text-3xl uppercase">{t(`legal.${title}`)}</h2>
                        <p className="text-text/85 mt-3 text-lg leading-relaxed">{body}</p>
                    </section>
                ))}
            </div>
        </SiteLayout>
    );
}

import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import type { AtlasShared } from '@/types/atlas';
import { Link, usePage } from '@inertiajs/react';

export default function ErrorPage() {
    const { status } = usePage<AtlasShared & { status: number }>().props;
    const { t, url } = useAtlas();
    const key = status === 404 ? '404' : status === 403 ? '403' : '500';
    return (
        <SiteLayout>
            <section className="bg-ink text-paper relative isolate flex min-h-[80svh] items-center overflow-hidden">
                <div className="vi-gradient absolute inset-x-0 top-0 h-1" aria-hidden />
                <div className="safe-px mx-auto w-full max-w-[1600px] pt-24 lg:px-8">
                    <p className="font-display text-paper/10 text-[28vw] leading-none sm:text-[16rem]" aria-hidden>
                        {status}
                    </p>
                    <h1 className="font-display text-giant -mt-[0.4em] leading-[0.9] uppercase">{t(`errors.${key}_title`)}</h1>
                    <p className="text-paper/80 mt-4 max-w-xl text-lg">{t(`errors.${key}_body`)}</p>
                    <Link href={url()} className="bg-neon text-ink mt-8 inline-flex min-h-12 items-center rounded-full px-6 text-sm font-bold">
                        {t('errors.home')}
                    </Link>
                </div>
            </section>
        </SiteLayout>
    );
}

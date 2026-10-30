import { BrandWordmark } from '@/components/site/brand-mark';
import { useAtlas } from '@/hooks/use-atlas';
import { Link } from '@inertiajs/react';
import { Toaster } from 'sonner';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const { url, site, t } = useAtlas();
    return (
        <div className="bg-canvas text-text grid min-h-svh lg:grid-cols-2">
            <div className="vi-gradient relative hidden overflow-hidden lg:block" aria-hidden>
                <p className="font-display text-ink absolute right-10 bottom-10 left-10 text-6xl leading-[0.9] uppercase">{t('home.hero_intro')}</p>
            </div>
            <div className="safe-px flex flex-col items-center justify-center gap-8 py-10">
                <Link href={url()} aria-label={site.name}>
                    <BrandWordmark name={site.name} />
                </Link>
                <div className="w-full max-w-sm">
                    <div className="mb-8 space-y-2 text-center">
                        <h1 className="font-display text-3xl uppercase">{title}</h1>
                        <p className="text-subtle text-sm">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
            <Toaster theme="dark" />
        </div>
    );
}

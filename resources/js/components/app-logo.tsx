import { BrandMark } from '@/components/site/brand-mark';
import type { AtlasShared } from '@/types/atlas';
import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { site } = usePage<AtlasShared>().props;
    return (
        <>
            <BrandMark className="size-8 shrink-0" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="font-display truncate text-base leading-none tracking-wide uppercase">{site?.name ?? 'Leonida Atlas'}</span>
                <span className="text-muted-foreground truncate text-[10px] tracking-widest uppercase">CMS</span>
            </div>
        </>
    );
}

import { cn } from '@/lib/utils';
import type { MediaItem } from '@/types/atlas';
import { TypePoster } from './type-poster';

/** Shows attached official artwork when present, otherwise a typographic poster (never an illustration). */
export function MediaFrame({
    media,
    still,
    type,
    label,
    className,
    imgClassName,
    priority = false,
}: {
    media?: MediaItem | null;
    still?: string | null;
    art?: string | null;
    type?: string;
    label?: string;
    className?: string;
    imgClassName?: string;
    priority?: boolean;
}) {
    return (
        <div className={cn('bg-charcoal relative overflow-hidden', className)}>
            {media?.url ? (
                <img
                    src={media.thumb && !priority ? media.thumb : media.url}
                    srcSet={media.thumb ? `${media.thumb} 640w, ${media.url} ${media.width ?? 1600}w` : undefined}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    alt={media.alt ?? ''}
                    width={media.width ?? undefined}
                    height={media.height ?? undefined}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    className={cn('h-full w-full object-cover', imgClassName)}
                />
            ) : still ? (
                <img
                    src={still}
                    alt=""
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    className={cn('h-full w-full object-cover', imgClassName)}
                />
            ) : (
                <TypePoster title={label ?? ''} type={type} className={imgClassName} />
            )}
        </div>
    );
}

export function youtubeThumb(id: string, quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault'): string {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
}

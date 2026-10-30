import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { youtubeThumb } from './media-frame';

/** Official trailer embed. The still is YouTube's own thumbnail; the player loads on click. */
export function YouTubeEmbed({ id, title, className }: { id: string; title: string; className?: string }) {
    const { t } = useTranslation();
    const [active, setActive] = useState(false);
    const [thumb, setThumb] = useState(youtubeThumb(id));
    return (
        <div className={cn('bg-ink relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10', className)}>
            {active ? (
                <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setActive(true)}
                    className="group absolute inset-0 text-left"
                    aria-label={`${t('entry.play_video')}: ${title}`}
                >
                    <img
                        src={thumb}
                        onError={() => setThumb(youtubeThumb(id, 'hqdefault'))}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <span className="from-ink/85 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                    <span className="bg-paper/95 text-ink absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-2xl transition-transform duration-300 group-hover:scale-110 sm:size-20">
                        <Play className="ml-1 size-7 fill-current" />
                    </span>
                    <span className="absolute right-4 bottom-3 left-4 flex items-end justify-between gap-3">
                        <span className="font-display text-paper text-2xl uppercase md:text-3xl">{title}</span>
                        <span className="text-paper/60 text-[10px]">© Rockstar Games · YouTube</span>
                    </span>
                </button>
            )}
        </div>
    );
}

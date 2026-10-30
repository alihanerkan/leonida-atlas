import { TruthScale } from '@/components/home/cover';
import { GuidesSection, MapPreviewSection, MysteriesSection, UpdatesSection, VehiclesSection } from '@/components/home/sections';
import { CastDeck, Chapter, HeroStage, StillsGallery, WorldStory } from '@/components/home/stage';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import type { AtlasShared, EntryCard, MapMarkerData, MediaItem } from '@/types/atlas';
import { usePage } from '@inertiajs/react';

interface Props extends AtlasShared {
    regions: EntryCard[];
    characters: EntryCard[];
    vehicles: EntryCard[];
    mysteries: EntryCard[];
    guides: EntryCard[];
    updates: EntryCard[];
    trailers: EntryCard[];
    mapPreview: MapMarkerData[];
    scenes: MediaItem[];
    screens: MediaItem[];
    stats: Record<string, number>;
    truth: Record<string, number>;
    sectionCounts: Record<string, number>;
}

export default function Home() {
    const p = usePage<Props>().props;
    const { t } = useAtlas();
    const enabled = new Set(p.site.homepage_sections ?? []);
    const on = (k: string) => enabled.size === 0 || enabled.has(k);

    return (
        <SiteLayout overlayHeader>
            <HeroStage
                scenes={p.scenes}
                characters={p.characters}
                counts={{ cast: p.sectionCounts.characters ?? p.characters.length, regions: p.regions.length, stills: p.screens.length }}
            />
            {on('characters') && p.characters.length > 0 && (
                <Chapter id="chapter-cast" no={1} title={t('home.ch_cast_title')} foil={t('home.ch_cast_foil')} sub={t('home.characters_intro')}>
                    <CastDeck characters={p.characters} />
                </Chapter>
            )}
            {on('world') && p.regions.length > 0 && (
                <Chapter id="chapter-world" no={2} title={t('home.ch_world_title')} foil={t('home.ch_world_foil')} sub={t('home.world_intro')}>
                    <WorldStory regions={p.regions} stats={p.stats} />
                </Chapter>
            )}
            <Chapter id="chapter-truth" no={3} title={t('home.ch_truth_title')} foil={t('home.ch_truth_foil')} sub={t('home.honesty_note')}>
                <TruthScale truth={p.truth} />
            </Chapter>
            {p.screens.length > 0 && (
                <Chapter
                    id="chapter-gallery"
                    no={4}
                    title={t('home.ch_gallery_title')}
                    foil={t('home.ch_gallery_foil')}
                    sub={t('home.ch_gallery_sub')}
                >
                    <StillsGallery screens={p.screens} />
                </Chapter>
            )}
            {on('map') && p.mapPreview.length > 0 && <MapPreviewSection markers={p.mapPreview} />}
            {on('mysteries') && p.mysteries.length > 0 && <MysteriesSection mysteries={p.mysteries} />}
            {on('vehicles') && p.vehicles.length > 0 && <VehiclesSection vehicles={p.vehicles} />}
            {on('guides') && p.guides.length > 0 && <GuidesSection guides={p.guides} />}
            {on('updates') && p.updates.length > 0 && <UpdatesSection updates={p.updates} trailers={p.trailers} />}
        </SiteLayout>
    );
}

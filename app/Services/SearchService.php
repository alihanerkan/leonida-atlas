<?php

namespace App\Services;

use App\Models\Entry;
use App\Support\SearchText;
use Illuminate\Database\Eloquent\Builder;

class SearchService
{
    /**
     * Language-aware search: matches the current locale and the English source,
     * ranks by where the term matched, and returns one result per entry.
     *
     * @return list<array>
     */
    public function search(string $query, string $locale, ?string $section = null, int $limit = 20): array
    {
        $q = SearchText::normalize($query);
        if (mb_strlen($q) < 2) {
            return [];
        }
        $folded = SearchText::fold($q);
        $like = '%'.addcslashes($q, '%_\\').'%';
        $likeFolded = '%'.addcslashes($folded, '%_\\').'%';

        $types = $section ? (config("atlas.content_sections.$section") ?? []) : array_keys(config('atlas.types'));

        $entries = EntryPresenter::publicQuery()
            ->whereIn('type', $types)
            ->where(function (Builder $w) use ($like, $likeFolded, $locale) {
                $w->whereHas('translations', fn (Builder $t) => $t
                    ->where('status', 'published')
                    ->whereIn('locale', array_unique([$locale, config('atlas.default_locale')]))
                    ->where(fn ($m) => $m->where('search_text', 'like', $like)->orWhere('search_text', 'like', $likeFolded)))
                    ->orWhereHas('tags', fn (Builder $t) => $t->where('names', 'like', $like)->orWhere('key', 'like', $likeFolded));
            })
            ->limit(200)
            ->get();

        return $entries
            ->map(function (Entry $e) use ($locale, $q, $folded) {
                $card = EntryPresenter::card($e, $locale);
                if (! $card) {
                    return null;
                }
                $card['score'] = $this->score($e, $locale, $q, $folded);

                return $card;
            })
            ->filter()
            ->sortByDesc('score')
            ->take($limit)
            ->values()
            ->all();
    }

    private function score(Entry $entry, string $locale, string $q, string $folded): int
    {
        [$t] = EntryPresenter::resolve($entry, $locale);
        $title = SearchText::normalize($t?->title);
        $titleFolded = SearchText::fold($t?->title);
        $aliases = SearchText::build($t?->aliases ?? []);
        $summary = SearchText::build([$t?->summary]);

        $score = 0;
        if ($title === $q || $titleFolded === $folded) {
            $score += 100;
        } elseif (str_starts_with($title, $q) || str_starts_with($titleFolded, $folded)) {
            $score += 70;
        } elseif (str_contains($title, $q) || str_contains($titleFolded, $folded)) {
            $score += 50;
        }
        if (str_contains($aliases, $q) || str_contains($aliases, $folded)) {
            $score += 35;
        }
        if (str_contains($summary, $q) || str_contains($summary, $folded)) {
            $score += 15;
        }
        $score += $entry->featured ? 5 : 0;
        $score += $entry->verification === 'official' ? 3 : 0;

        return $score + 1;
    }
}

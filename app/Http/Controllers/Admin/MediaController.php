<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\Media;
use App\Support\Audit;
use App\Support\Locales;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('media.upload');
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'kind' => ['nullable', Rule::in(['image', 'embed'])],
            'usage' => ['nullable', Rule::in(config('atlas.media_usage'))],
        ]);
        $query = Media::query()->withCount('entries')->latest();
        if (! empty($filters['q'])) {
            $like = '%'.addcslashes($filters['q'], '%_\\').'%';
            $query->where(fn ($w) => $w->where('title', 'like', $like)->orWhere('attribution', 'like', $like)->orWhere('tags', 'like', $like));
        }
        if (! empty($filters['kind'])) {
            $query->where('kind', $filters['kind']);
        }
        if (! empty($filters['usage'])) {
            $query->where('usage_status', $filters['usage']);
        }
        $page = $query->paginate(36)->withQueryString();
        $heroCounts = Entry::whereIn('hero_media_id', collect($page->items())->pluck('id'))->selectRaw('hero_media_id, count(*) as c')->groupBy('hero_media_id')->pluck('c', 'hero_media_id');

        return Inertia::render('admin/media/index', [
            'items' => collect($page->items())->map(fn (Media $m) => array_merge($m->present('en'), [
                'alt_all' => $m->alt ?? (object) [],
                'caption_all' => $m->caption ?? (object) [],
                'tags' => $m->tags ?? [],
                'mime' => $m->mime,
                'size' => $m->size,
                'usage_count' => $m->entries_count + (int) ($heroCounts[$m->id] ?? 0),
                'created_at' => $m->created_at?->toIso8601String(),
            ])),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'filters' => $filters,
            'usageOptions' => config('atlas.media_usage'),
            'locales' => Locales::codes(),
            'limits' => ['max_kb' => config('atlas.media.max_kb'), 'mimes' => config('atlas.media.mimes')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('media.upload');
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:'.implode(',', config('atlas.media.mimes')), 'max:'.config('atlas.media.max_kb'), 'dimensions:min_width=32,min_height=32,max_width=10000,max_height=10000'],
            'title' => ['nullable', 'string', 'max:255'],
            'attribution' => ['required', 'string', 'max:255'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'license' => ['nullable', 'string', 'max:255'],
            'usage_status' => ['required', Rule::in(config('atlas.media_usage'))],
            'alt_en' => ['required', 'string', 'max:300'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $hash = hash_file('sha256', $file->getRealPath());
        if ($existing = Media::where('hash', $hash)->first()) {
            return back()->with('error', "Duplicate: this file is already in the library as #{$existing->id}.");
        }

        $disk = config('atlas.media.disk');
        $dir = 'media/'.now()->format('Y/m');
        $name = Str::uuid()->toString();
        $ext = strtolower($file->guessExtension() ?: $file->extension());
        $path = $file->storeAs($dir, "$name.$ext", $disk);
        [$width, $height] = getimagesize($file->getRealPath()) ?: [null, null];
        $thumb = app(\App\Services\MediaStore::class)->thumbnail(file_get_contents($file->getRealPath()), $disk, "$dir/{$name}_thumb.webp");

        $media = Media::create([
            'kind' => 'image',
            'disk' => $disk,
            'path' => $path,
            'thumb_path' => $thumb,
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'width' => $width,
            'height' => $height,
            'hash' => $hash,
            'title' => $request->input('title') ?: pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'attribution' => $request->input('attribution'),
            'source_url' => $request->input('source_url'),
            'license' => $request->input('license'),
            'usage_status' => $request->input('usage_status'),
            'alt' => ['en' => $request->input('alt_en')],
            'uploaded_by' => $request->user()->id,
        ]);
        Audit::log('media.uploaded', $media, label: $media->title);

        return back()->with('success', 'Image uploaded.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('media.manage');
        $media = Media::findOrFail($id);
        $locales = Locales::codes();
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'attribution' => ['nullable', 'string', 'max:255'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'license' => ['nullable', 'string', 'max:255'],
            'usage_status' => ['required', Rule::in(config('atlas.media_usage'))],
            'alt' => ['nullable', 'array'],
            'alt.*' => ['nullable', 'string', 'max:300'],
            'caption' => ['nullable', 'array'],
            'caption.*' => ['nullable', 'string', 'max:500'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
        ]);
        $data['alt'] = collect($data['alt'] ?? [])->only($locales)->filter()->all();
        $data['caption'] = collect($data['caption'] ?? [])->only($locales)->filter()->all();
        $media->update($data);
        Audit::log('media.updated', $media, label: $media->title);

        return back()->with('success', 'Media updated.');
    }

    public function destroy(int $id): RedirectResponse
    {
        Gate::authorize('media.manage');
        $media = Media::findOrFail($id);
        $usage = $media->usageCount();
        if ($usage > 0) {
            return back()->with('error', "This media is used by $usage entr".($usage === 1 ? 'y' : 'ies').'. Remove those references first.');
        }
        if ($media->path) {
            Storage::disk($media->disk)->delete(array_filter([$media->path, $media->thumb_path]));
        }
        $media->forceDelete();
        Audit::log('media.deleted', null, ['media' => $id], $media->title);

        return back()->with('success', 'Media deleted.');
    }
}

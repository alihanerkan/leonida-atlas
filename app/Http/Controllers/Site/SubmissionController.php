<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\Submission;
use App\Support\Audit;
use App\Support\Dictionary;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubmissionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        abort_unless(Settings::get('features')['submissions'] ?? true, 403);

        $data = $request->validate([
            'kind' => ['required', Rule::in(['new', 'correction', 'evidence'])],
            'entry_type' => ['nullable', Rule::in(array_keys(config('atlas.types')))],
            'entry_id' => ['nullable', 'integer', Rule::exists('entries', 'id')->whereNull('deleted_at')],
            'locale' => ['required', Rule::in(Locales::codes())],
            'title' => ['required', 'string', 'min:4', 'max:200'],
            'body' => ['required', 'string', 'min:20', 'max:5000'],
            'source_url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);
        if (! empty($data['entry_id']) && ! Entry::published()->whereKey($data['entry_id'])->exists()) {
            abort(422);
        }

        $submission = Submission::create([...$data, 'user_id' => $request->user()->id, 'status' => 'pending']);
        Audit::log('submission.created', $submission, label: $submission->title);

        return back()->with('success', Dictionary::t('contribute.thanks', $data['locale']));
    }
}

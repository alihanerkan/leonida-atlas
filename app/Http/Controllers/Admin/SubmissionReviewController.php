<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Services\EntryService;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubmissionReviewController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('submissions.review');
        $status = in_array($request->query('status'), ['pending', 'accepted', 'rejected']) ? $request->query('status') : 'pending';
        $page = Submission::with(['user:id,name,email', 'entry.translations', 'reviewer:id,name'])->where('status', $status)->latest()->paginate(25)->withQueryString();

        return Inertia::render('admin/submissions', [
            'items' => collect($page->items())->map(fn (Submission $s) => [
                'id' => $s->id,
                'kind' => $s->kind,
                'entry_type' => $s->entry_type,
                'locale' => $s->locale,
                'title' => $s->title,
                'body' => $s->body,
                'source_url' => $s->source_url,
                'status' => $s->status,
                'user' => $s->user?->name,
                'entry' => $s->entry ? ['id' => $s->entry->id, 'title' => $s->entry->label('en')] : null,
                'reviewer' => $s->reviewer?->name,
                'review_note' => $s->review_note,
                'created_at' => $s->created_at?->toIso8601String(),
            ]),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'status' => $status,
            'counts' => Submission::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status'),
        ]);
    }

    public function review(Request $request, int $id, EntryService $service): RedirectResponse
    {
        Gate::authorize('submissions.review');
        $submission = Submission::where('status', 'pending')->findOrFail($id);
        $data = $request->validate([
            'decision' => ['required', Rule::in(['accept', 'reject'])],
            'note' => ['nullable', 'string', 'max:2000'],
            'create_draft' => ['boolean'],
        ]);

        $submission->update([
            'status' => $data['decision'] === 'accept' ? 'accepted' : 'rejected',
            'reviewer_id' => $request->user()->id,
            'review_note' => $data['note'] ?? null,
            'reviewed_at' => now(),
        ]);

        $message = 'Submission '.$submission->status.'.';
        // Accepted "new" submissions can seed an unverified draft; they are never published automatically.
        if ($data['decision'] === 'accept' && ($data['create_draft'] ?? false) && $submission->kind === 'new' && $submission->entry_type) {
            $key = Str::slug($submission->title).'-'.Str::lower(Str::random(4));
            $entry = $service->save(null, [
                'type' => $submission->entry_type,
                'key' => $key,
                'status' => 'draft',
                'verification' => 'unverified',
                'confidence' => 'low',
                'spoiler_level' => 'none',
                'research_notes' => "Created from community submission #{$submission->id}. Source: ".($submission->source_url ?: 'none provided'),
                'source' => ['title' => $submission->title, 'summary' => Str::limit($submission->body, 300), 'body' => $submission->body, 'status' => 'draft'],
                'specs' => [],
            ], $request->user());
            $submission->update(['entry_id' => $entry->id]);
            $message .= ' Draft entry created.';
        }
        Audit::log('submission.'.$submission->status, $submission, label: $submission->title);

        return back()->with('success', $message);
    }
}

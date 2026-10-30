<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Entry;
use App\Models\EntryTranslation;
use App\Models\Submission;
use App\Support\Locales;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        Gate::authorize('admin.access');

        $total = Entry::count();
        $byStatus = Entry::selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $byType = Entry::selectRaw('type, count(*) as c')->groupBy('type')->orderByDesc('c')->pluck('c', 'type');
        $byVerification = Entry::selectRaw('verification, count(*) as c')->groupBy('verification')->pluck('c', 'verification');
        $awaiting = Entry::whereIn('verification', ['unverified', 'rumor'])->orWhere('status', 'review')->count();

        $translated = EntryTranslation::whereHas('entry')->selectRaw('locale, count(*) as c')->groupBy('locale')->pluck('c', 'locale');
        $machine = EntryTranslation::whereHas('entry')->where('is_machine', true)->whereNull('reviewed_at')->selectRaw('locale, count(*) as c')->groupBy('locale')->pluck('c', 'locale');
        $translations = collect(Locales::codes())->map(fn ($l) => [
            'locale' => $l,
            'translated' => (int) ($translated[$l] ?? 0),
            'missing' => max(0, $total - (int) ($translated[$l] ?? 0)),
            'unreviewed_machine' => (int) ($machine[$l] ?? 0),
        ]);

        $recent = Entry::with(['translations:id,entry_id,locale,title', 'editor:id,name'])->latest('updated_at')->limit(8)->get()->map(fn ($e) => [
            'id' => $e->id,
            'title' => $e->label('en'),
            'type' => $e->type,
            'status' => $e->status,
            'editor' => $e->editor?->name,
            'updated_at' => $e->updated_at?->toIso8601String(),
        ]);

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'total' => $total,
                'published' => (int) ($byStatus['published'] ?? 0),
                'drafts' => (int) ($byStatus['draft'] ?? 0),
                'review' => (int) ($byStatus['review'] ?? 0),
                'awaiting_verification' => $awaiting,
                'pending_submissions' => Submission::where('status', 'pending')->count(),
                'trashed' => Entry::onlyTrashed()->count(),
            ],
            'byType' => $byType,
            'byVerification' => $byVerification,
            'translations' => $translations,
            'recent' => $recent,
            'activity' => Gate::allows('audit.view') ? AuditEvent::with('user:id,name')->latest('created_at')->limit(10)->get()->map(fn ($a) => [
                'id' => $a->id, 'action' => $a->action, 'label' => $a->subject_label, 'user' => $a->user?->name, 'date' => $a->created_at?->toIso8601String(),
            ]) : [],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('audit.view');
        $action = (string) $request->string('action')->limit(64);
        $page = AuditEvent::with('user:id,name')
            ->when($action !== '', fn ($q) => $q->where('action', 'like', addcslashes($action, '%_\\').'%'))
            ->latest('created_at')->paginate(50)->withQueryString();

        return Inertia::render('admin/audit', [
            'events' => collect($page->items())->map(fn (AuditEvent $a) => [
                'id' => $a->id, 'action' => $a->action, 'subject_type' => $a->subject_type, 'subject_id' => $a->subject_id,
                'label' => $a->subject_label, 'meta' => $a->meta, 'user' => $a->user?->name, 'ip' => $a->ip, 'date' => $a->created_at?->toIso8601String(),
            ]),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'filters' => ['action' => $action],
            'actions' => AuditEvent::distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}

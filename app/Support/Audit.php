<?php

namespace App\Support;

use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Model;

class Audit
{
    public static function log(string $action, ?Model $subject = null, array $meta = [], ?string $label = null): void
    {
        $request = request();
        AuditEvent::create([
            'user_id' => $request?->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label ?? ($subject && method_exists($subject, 'label') ? $subject->label('en') : ($subject->title ?? $subject->name ?? null)),
            'meta' => $meta ?: null,
            'ip' => $request?->ip(),
            'created_at' => now(),
        ]);
    }
}

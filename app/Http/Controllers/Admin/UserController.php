<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use App\Support\Locales;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('users.manage');
        $q = (string) $request->string('q')->limit(100);
        $role = in_array($request->query('role'), config('atlas.roles')) ? $request->query('role') : null;
        $page = User::query()
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('name', 'like', "%$q%")->orWhere('email', 'like', "%$q%")))
            ->when($role, fn ($w) => $w->where('role', $role))
            ->orderBy('name')->paginate(25)->withQueryString();

        return Inertia::render('admin/users', [
            'users' => collect($page->items())->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role,
                'is_active' => $u->is_active, 'translator_locales' => $u->translator_locales ?? [],
                'last_login_at' => $u->last_login_at?->toIso8601String(), 'created_at' => $u->created_at?->toIso8601String(),
            ]),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'filters' => ['q' => $q, 'role' => $role],
            'roles' => config('atlas.roles'),
            'permissions' => config('atlas.permissions'),
            'locales' => Locales::codes(),
        ]);
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('users.manage');
        $actor = $request->user();
        $user = User::findOrFail($id);
        $data = $request->validate([
            'role' => ['required', Rule::in(config('atlas.roles'))],
            'is_active' => ['boolean'],
            'translator_locales' => ['nullable', 'array'],
            'translator_locales.*' => [Rule::in(Locales::codes())],
        ]);

        if ($user->id === $actor->id && ($data['role'] !== $user->role || ! ($data['is_active'] ?? true))) {
            return back()->with('error', 'You cannot change your own role or deactivate yourself.');
        }
        if (($data['role'] === 'super_admin' || $user->role === 'super_admin') && $actor->role !== 'super_admin') {
            return back()->with('error', 'Only a super admin can grant or revoke the super admin role.');
        }

        $before = $user->only(['role', 'is_active', 'translator_locales']);
        $user->role = $data['role'];
        $user->is_active = $data['is_active'] ?? true;
        $user->translator_locales = $data['role'] === 'translator' ? array_values($data['translator_locales'] ?? []) : null;
        $user->save();
        Audit::log('user.updated', $user, ['before' => $before, 'after' => $user->only(['role', 'is_active', 'translator_locales'])], $user->email);

        return back()->with('success', 'User updated.');
    }
}

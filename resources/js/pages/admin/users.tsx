import { AdminLayout, DataTable, Pagination, Panel, Td, Th, relativeTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { AtlasShared } from '@/types/atlas';
import { router, usePage } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface U {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    translator_locales: string[];
    last_login_at: string | null;
}

interface Props extends AtlasShared {
    users: U[];
    pagination: { current: number; last: number; total: number };
    filters: { q: string; role: string | null };
    roles: string[];
    permissions: Record<string, string[]>;
    locales: { code: string; native: string; name: string; intl: string }[];
}

export default function Users() {
    const { users, pagination, filters, roles, permissions, locale } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    return (
        <AdminLayout title={t('users.title')} description={t('users.subtitle')} breadcrumbs={[{ title: t('nav.users'), href: '/admin/users' }]}>
            <div className="flex flex-wrap gap-2">
                <input
                    defaultValue={filters.q}
                    placeholder={t('common.search')}
                    aria-label={t('common.search')}
                    onKeyDown={(e) =>
                        e.key === 'Enter' && router.get('/admin/users', { q: (e.target as HTMLInputElement).value, role: filters.role ?? '' })
                    }
                    className="bg-background min-h-10 flex-1 rounded-md border px-3 text-sm"
                />
                <select
                    aria-label={t('users.role')}
                    value={filters.role ?? ''}
                    onChange={(e) => router.get('/admin/users', { q: filters.q, role: e.target.value })}
                    className="bg-background min-h-10 rounded-md border px-3 text-sm"
                >
                    <option value="">
                        {t('users.role')}: {t('common.all')}
                    </option>
                    {roles.map((r) => (
                        <option key={r} value={r}>
                            {t(`users.roles.${r}`)}
                        </option>
                    ))}
                </select>
            </div>
            <DataTable>
                <thead>
                    <tr>
                        <Th>{t('common.user')}</Th>
                        <Th>{t('users.role')}</Th>
                        <Th>{t('users.translator_locales')}</Th>
                        <Th>{t('users.active')}</Th>
                        <Th>{t('users.last_login')}</Th>
                        <Th />
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <UserRow key={u.id} user={u} roles={roles} locale={locale} />
                    ))}
                </tbody>
            </DataTable>
            <Pagination pagination={pagination} />
            <Panel title={t('users.permissions')}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-xs">
                        <thead>
                            <tr>
                                <th className="py-2 text-left">Permission</th>
                                {roles.map((r) => (
                                    <th key={r} className="px-2 py-2">
                                        {t(`users.roles.${r}`)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(permissions).map(([p, allowed]) => (
                                <tr key={p} className="border-t">
                                    <td className="py-1.5 font-mono">{p}</td>
                                    {roles.map((r) => (
                                        <td key={r} className="px-2 text-center">
                                            {allowed.includes(r) ? (
                                                <Check className="mx-auto size-3.5 text-emerald-400" aria-label="yes" />
                                            ) : (
                                                <span className="text-muted-foreground">·</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </AdminLayout>
    );
}

function UserRow({ user, roles, locale }: { user: U; roles: string[]; locale: string }) {
    const { t } = useTranslation('admin');
    const { locales } = usePage<Props>().props;
    const [role, setRole] = useState(user.role);
    const [active, setActive] = useState(user.is_active);
    const [langs, setLangs] = useState<string[]>(user.translator_locales);
    const dirty = role !== user.role || active !== user.is_active || langs.join() !== user.translator_locales.join();
    return (
        <tr className="hover:bg-muted/30">
            <Td>
                <div className="font-medium">{user.name}</div>
                <div className="text-muted-foreground text-xs">{user.email}</div>
            </Td>
            <Td>
                <select
                    aria-label={t('users.role')}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-background min-h-9 rounded-md border px-2 text-sm"
                >
                    {roles.map((r) => (
                        <option key={r} value={r}>
                            {t(`users.roles.${r}`)}
                        </option>
                    ))}
                </select>
            </Td>
            <Td>
                {role === 'translator' ? (
                    <div className="flex flex-wrap gap-1">
                        {locales.map((l) => (
                            <label key={l.code} className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={langs.includes(l.code)}
                                    onChange={() => setLangs(langs.includes(l.code) ? langs.filter((x) => x !== l.code) : [...langs, l.code])}
                                />
                                {l.code}
                            </label>
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )}
            </Td>
            <Td>
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    {active ? t('users.active') : t('users.inactive')}
                </label>
            </Td>
            <Td className="text-muted-foreground text-xs">{relativeTime(user.last_login_at, locale)}</Td>
            <Td>
                <Button
                    size="sm"
                    disabled={!dirty}
                    onClick={() =>
                        router.put(`/admin/users/${user.id}`, { role, is_active: active, translator_locales: langs }, { preserveScroll: true })
                    }
                >
                    {t('common.save')}
                </Button>
            </Td>
        </tr>
    );
}

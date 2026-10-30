import InputError from '@/components/input-error';
import { PageHero } from '@/components/site/page-hero';
import { useAtlas } from '@/hooks/use-atlas';
import SiteLayout from '@/layouts/site-layout';
import { cn } from '@/lib/utils';
import type { AtlasShared } from '@/types/atlas';
import { Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';

export default function Contribute() {
    const { types } = usePage<AtlasShared & { types: string[] }>().props;
    const { t, locale, user, site } = useAtlas();
    const entryId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('entry') : null;
    const form = useForm({
        kind: entryId ? 'correction' : 'new',
        entry_type: '',
        entry_id: entryId ?? '',
        locale,
        title: '',
        body: '',
        source_url: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/submissions', { preserveScroll: true, onSuccess: () => form.reset('title', 'body', 'source_url') });
    };

    const field = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-neon';

    return (
        <SiteLayout>
            <PageHero kicker={t('nav.contribute')} title={t('contribute.title')} intro={t('contribute.intro')} art="rumor" compact />
            <div className="safe-px mx-auto grid max-w-[1600px] gap-12 py-14 lg:grid-cols-12 lg:px-8">
                <div className="lg:col-span-7">
                    {site.features.submissions === false ? null : !user ? (
                        <div className="border-line rounded-3xl border p-8">
                            <p>{t('contribute.sign_in_required')}</p>
                            <div className="mt-5 flex gap-3">
                                <Link
                                    href="/login"
                                    className="bg-neon text-ink inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold"
                                >
                                    {t('nav.login')}
                                </Link>
                                <Link
                                    href="/register"
                                    className="border-line inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold"
                                >
                                    {t('nav.register')}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-6" noValidate>
                            <fieldset>
                                <legend className="mb-3 text-sm font-medium">{t('contribute.kind')}</legend>
                                <div className="flex flex-wrap gap-2">
                                    {(['new', 'correction', 'evidence'] as const).map((k) => (
                                        <label
                                            key={k}
                                            className={cn(
                                                'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm',
                                                form.data.kind === k ? 'border-neon bg-neon/15 text-neon' : 'border-line',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="kind"
                                                value={k}
                                                checked={form.data.kind === k}
                                                onChange={() => form.setData('kind', k)}
                                                className="sr-only"
                                            />
                                            {t(`contribute.kind_${k}`)}
                                        </label>
                                    ))}
                                </div>
                                <InputError message={form.errors.kind} />
                            </fieldset>
                            {form.data.kind === 'new' && (
                                <label className="block">
                                    <span className="mb-1.5 block text-sm font-medium">{t('contribute.field_type')}</span>
                                    <select
                                        value={form.data.entry_type}
                                        onChange={(e) => form.setData('entry_type', e.target.value)}
                                        className={field}
                                    >
                                        <option value="">—</option>
                                        {types.map((ty) => (
                                            <option key={ty} value={ty}>
                                                {t(`types.${ty}`)}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={form.errors.entry_type} />
                                </label>
                            )}
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium">{t('contribute.field_title')}</span>
                                <input
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    maxLength={200}
                                    required
                                    className={field}
                                    aria-invalid={!!form.errors.title}
                                />
                                <InputError message={form.errors.title} />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium">{t('contribute.field_body')}</span>
                                <span className="text-subtle mb-2 block text-xs">{t('contribute.field_body_hint')}</span>
                                <textarea
                                    value={form.data.body}
                                    onChange={(e) => form.setData('body', e.target.value)}
                                    rows={7}
                                    maxLength={5000}
                                    required
                                    className={cn(field, 'py-2')}
                                    aria-invalid={!!form.errors.body}
                                />
                                <InputError message={form.errors.body} />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block text-sm font-medium">{t('contribute.field_source')}</span>
                                <input
                                    type="url"
                                    value={form.data.source_url}
                                    onChange={(e) => form.setData('source_url', e.target.value)}
                                    placeholder="https://"
                                    className={field}
                                    aria-invalid={!!form.errors.source_url}
                                />
                                <InputError message={form.errors.source_url} />
                            </label>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="bg-neon text-ink inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold disabled:opacity-60"
                            >
                                {form.processing && <LoaderCircle className="size-4 animate-spin" />}
                                {t('contribute.submit')}
                            </button>
                        </form>
                    )}
                </div>
                <aside className="lg:col-span-5">
                    <div className="border-line rounded-3xl border p-6">
                        <h2 className="label-caps text-subtle mb-4">{t('contribute.guidelines')}</h2>
                        <ul className="space-y-3 text-sm leading-relaxed">
                            {(['guideline_1', 'guideline_2', 'guideline_3'] as const).map((g) => (
                                <li key={g} className="flex gap-3">
                                    <span className="bg-neon mt-2 size-1.5 shrink-0 rounded-full" />
                                    {t(`contribute.${g}`)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </SiteLayout>
    );
}

import { AdminLayout, Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { AtlasShared } from '@/types/atlas';
import { useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function Import() {
    const { example } = usePage<AtlasShared & { example: unknown }>().props;
    const { t } = useTranslation('admin');
    const form = useForm<{ file: File | null }>({ file: null });
    return (
        <AdminLayout title={t('import.title')} description={t('import.subtitle')} breadcrumbs={[{ title: t('nav.import'), href: '/admin/import' }]}>
            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title={t('import.file')}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/admin/import', { forceFormData: true, onSuccess: () => form.reset() });
                        }}
                        className="space-y-4"
                    >
                        <input
                            type="file"
                            accept="application/json,.json"
                            aria-label={t('import.file')}
                            onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                            className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2"
                        />
                        {form.errors.file && <p className="text-destructive text-sm">{form.errors.file}</p>}
                        <Button type="submit" disabled={!form.data.file || form.processing}>
                            {t('import.run')}
                        </Button>
                    </form>
                </Panel>
                <Panel title={t('import.format')}>
                    <pre className="bg-muted max-h-[420px] overflow-auto rounded-md p-3 text-xs">{JSON.stringify(example, null, 2)}</pre>
                </Panel>
            </div>
        </AdminLayout>
    );
}

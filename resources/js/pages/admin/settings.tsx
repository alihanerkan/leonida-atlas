import { AdminLayout, Panel, SelectInput, TextArea, TextInput, Toggle } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { AtlasShared } from '@/types/atlas';
import { useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

type S = {
    site_name: string;
    tagline: string | null;
    default_locale: string;
    enabled_locales: string[];
    social_links: Record<string, string | null>;
    seo_default_description: string | null;
    homepage_sections: string[];
    features: Record<string, boolean>;
    analytics_id: string | null;
    maintenance_message: string | null;
    disclaimer: string | null;
};

interface Props extends Omit<AtlasShared, 'locales'> {
    settings: S;
    locales: string[];
    homepageSections: string[];
    storage: { disk: string; note: string };
}

export default function Settings() {
    const { settings, locales, homepageSections, storage } = usePage<Props>().props;
    const { t } = useTranslation('admin');
    const form = useForm<S>({
        ...settings,
        tagline: settings.tagline ?? '',
        seo_default_description: settings.seo_default_description ?? '',
        analytics_id: settings.analytics_id ?? '',
        maintenance_message: settings.maintenance_message ?? '',
        disclaimer: settings.disclaimer ?? '',
        social_links: { x: '', youtube: '', discord: '', ...settings.social_links },
    });
    const d = form.data;
    const e = form.errors as Record<string, string | undefined>;
    const toggleIn = (key: 'enabled_locales' | 'homepage_sections', v: string) =>
        form.setData(key, d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v]);

    return (
        <AdminLayout
            title={t('settings.title')}
            description={t('settings.subtitle')}
            breadcrumbs={[{ title: t('nav.settings'), href: '/admin/settings' }]}
        >
            <form
                className="grid gap-4 lg:grid-cols-2"
                onSubmit={(ev) => {
                    ev.preventDefault();
                    form.transform((data) => ({
                        ...data,
                        social_links: Object.fromEntries(Object.entries(data.social_links).map(([k, v]) => [k, v || null])),
                    }));
                    form.put('/admin/settings', { preserveScroll: true });
                }}
            >
                <Panel title={t('settings.branding')}>
                    <div className="space-y-3">
                        <TextInput
                            label={t('settings.site_name')}
                            value={d.site_name}
                            onChange={(v) => form.setData('site_name', v)}
                            error={e.site_name}
                            required
                        />
                        <TextInput label={t('settings.tagline')} value={d.tagline} onChange={(v) => form.setData('tagline', v)} />
                        <TextArea label={t('settings.legal')} value={d.disclaimer} onChange={(v) => form.setData('disclaimer', v)} rows={3} />
                    </div>
                </Panel>
                <Panel title={t('settings.languages')}>
                    <div className="space-y-3">
                        <SelectInput
                            label={t('settings.default_locale')}
                            value={d.default_locale}
                            onChange={(v) => form.setData('default_locale', v)}
                            options={locales.map((l) => ({ value: l, label: l }))}
                        />
                        <fieldset>
                            <legend className="mb-2 text-sm font-medium">{t('settings.enabled_locales')}</legend>
                            <div className="flex flex-wrap gap-3">
                                {locales.map((l) => (
                                    <label key={l} className="inline-flex items-center gap-1.5 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={d.enabled_locales.includes(l)}
                                            onChange={() => toggleIn('enabled_locales', l)}
                                        />{' '}
                                        {l}
                                    </label>
                                ))}
                            </div>
                            {e.enabled_locales && <p className="text-destructive text-sm">{e.enabled_locales}</p>}
                        </fieldset>
                    </div>
                </Panel>
                <Panel title={t('settings.seo')}>
                    <div className="space-y-3">
                        <TextArea
                            label={t('settings.seo_description')}
                            value={d.seo_default_description}
                            onChange={(v) => form.setData('seo_default_description', v)}
                            rows={2}
                        />
                        <TextInput
                            label={t('settings.analytics')}
                            value={d.analytics_id}
                            onChange={(v) => form.setData('analytics_id', v)}
                            error={e.analytics_id}
                        />
                    </div>
                </Panel>
                <Panel title={t('settings.social')}>
                    <div className="space-y-3">
                        {(['x', 'youtube', 'discord'] as const).map((k) => (
                            <TextInput
                                key={k}
                                label={k}
                                type="url"
                                value={d.social_links[k] ?? ''}
                                onChange={(v) => form.setData('social_links', { ...d.social_links, [k]: v })}
                                error={e[`social_links.${k}`]}
                                placeholder="https://"
                            />
                        ))}
                    </div>
                </Panel>
                <Panel title={t('settings.homepage')}>
                    <div className="space-y-1">
                        {homepageSections.map((s) => (
                            <Toggle
                                key={s}
                                label={t(`settings.section_names.${s}`)}
                                checked={d.homepage_sections.includes(s)}
                                onChange={() => toggleIn('homepage_sections', s)}
                            />
                        ))}
                    </div>
                </Panel>
                <Panel title={t('settings.features')}>
                    <div className="space-y-1">
                        <Toggle
                            label={t('settings.feature_submissions')}
                            checked={!!d.features.submissions}
                            onChange={(v) => form.setData('features', { ...d.features, submissions: v })}
                        />
                        <Toggle
                            label={t('settings.feature_user_markers')}
                            checked={!!d.features.user_markers}
                            onChange={(v) => form.setData('features', { ...d.features, user_markers: v })}
                        />
                        <Toggle
                            label={t('settings.feature_machine_translation')}
                            checked={!!d.features.machine_translation}
                            onChange={(v) => form.setData('features', { ...d.features, machine_translation: v })}
                            disabled
                        />
                        <TextInput
                            label={t('settings.maintenance')}
                            value={d.maintenance_message}
                            onChange={(v) => form.setData('maintenance_message', v)}
                        />
                        <p className="text-muted-foreground pt-2 text-xs">
                            {t('settings.storage')}: <code>{storage.disk}</code> — {storage.note}
                        </p>
                    </div>
                </Panel>
                <div className="lg:col-span-2">
                    <Button type="submit" disabled={form.processing}>
                        {t('common.save')}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}

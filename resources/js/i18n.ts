import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import adminEn from '../locales/admin/en.json';
import en from '../locales/en.json';

// English ships in the main bundle as the fallback; other locales load on demand.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>(['../locales/*.json', '!../locales/en.json']);
const adminLoaders = import.meta.glob<{ default: Record<string, unknown> }>(['../locales/admin/*.json', '!../locales/admin/en.json']);

i18n.use(initReactI18next).init({
    resources: { en: { translation: en, admin: adminEn } },
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation', 'admin'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
});

export async function loadLocale(code: string): Promise<void> {
    if (code === 'en') return;
    const tasks: Promise<void>[] = [];
    if (!i18n.hasResourceBundle(code, 'translation')) {
        const loader = loaders[`../locales/${code}.json`];
        if (loader) tasks.push(loader().then((m) => void i18n.addResourceBundle(code, 'translation', m.default, true, true)));
    }
    if (!i18n.hasResourceBundle(code, 'admin')) {
        const loader = adminLoaders[`../locales/admin/${code}.json`];
        if (loader) tasks.push(loader().then((m) => void i18n.addResourceBundle(code, 'admin', m.default, true, true)));
    }
    await Promise.all(tasks);
}

export async function applyLocale(code: string): Promise<void> {
    await loadLocale(code);
    if (i18n.language !== code) await i18n.changeLanguage(code);
    document.documentElement.lang = code;
}

export default i18n;

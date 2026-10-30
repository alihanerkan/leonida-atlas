import '@fontsource-variable/inter';
import '@fontsource-variable/oswald';
import '@fontsource/anton/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';
import { applyLocale } from './i18n';

declare global {
    const route: typeof routeFn;
}

createInertiaApp({
    // Page titles already include the site name (set server-side via Seo::meta).
    title: (title) => title,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const locale = (props.initialPage.props as { locale?: string }).locale ?? 'en';
        // Render after the active dictionary loads so the first paint is already in the right language.
        void applyLocale(locale)
            .catch(() => undefined)
            .finally(() => createRoot(el).render(<App {...props} />));
    },
    progress: {
        color: '#ff2e88',
        showSpinner: false,
    },
});

initializeTheme();

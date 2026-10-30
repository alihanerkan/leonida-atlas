import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

// Dark is the Leonida Atlas default; light and system are opt-in.
const DEFAULT_APPEARANCE: Appearance = 'dark';

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const read = (): Appearance => {
    try {
        return (localStorage.getItem('appearance') as Appearance) || DEFAULT_APPEARANCE;
    } catch {
        return DEFAULT_APPEARANCE;
    }
};

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const handleSystemThemeChange = () => applyTheme(read());

export function initializeTheme() {
    applyTheme(read());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        try {
            localStorage.setItem('appearance', mode);
        } catch {
            // Storage can be unavailable (private mode); the theme still applies for this page view.
        }
        applyTheme(mode);
    };

    useEffect(() => {
        setAppearance(read());
    }, []);

    return { appearance, updateAppearance };
}

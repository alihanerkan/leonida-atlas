function xsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export class HttpError extends Error {
    constructor(
        public status: number,
        public body: unknown,
    ) {
        super(`HTTP ${status}`);
    }
}

/** Same-origin JSON requests that carry Laravel's CSRF token. */
export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const token = xsrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
        method: init.method ?? 'GET',
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        credentials: 'same-origin',
        signal: init.signal,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new HttpError(res.status, data);
    return data as T;
}

export const storage = {
    get<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key: string, value: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Storage may be full or blocked; tracking keeps working in memory for this session.
        }
    },
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // ignore
        }
    },
};

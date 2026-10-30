import { useId } from 'react';

/**
 * Original schematic artwork of the state of Leonida (viewBox 1000×1000).
 * It is a stylised, not-to-scale illustration — not the official game map and not traced from any leak.
 * Marker coordinates are normalised (0–1) against this canvas.
 */
export const LAND_PATH =
    'M40 150 L120 142 L210 146 L300 138 L380 134 L460 136 L540 130 L600 132 L645 142 L672 190 L692 252 L712 320 L732 392 L756 460 L776 522 L798 586 L816 642 L830 704 L828 760 L814 806 L790 842 L758 866 L726 872 L708 852 L696 818 L680 766 L660 712 L640 662 L626 612 L606 556 L594 500 L584 446 L574 396 L560 336 L546 292 L522 268 L484 258 L436 252 L388 262 L332 262 L288 254 L240 248 L196 256 L148 262 L100 254 L60 246 L36 220 Z';

const KEYS: [number, number, number][] = [
    [712, 886, 16],
    [672, 898, 13],
    [634, 906, 15],
    [596, 914, 12],
    [560, 922, 14],
    [522, 930, 11],
    [486, 938, 12],
    [452, 946, 9],
];

export function LeonidaMapArt({ className }: { className?: string }) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const g = (n: string) => `${uid}-${n}`;

    return (
        <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <defs>
                <radialGradient id={g('sea')} cx="0.65" cy="0.6" r="0.8">
                    <stop offset="0" stopColor="#0f1730" />
                    <stop offset="1" stopColor="#060812" />
                </radialGradient>
                <linearGradient id={g('land')} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#1d1928" />
                    <stop offset="0.6" stopColor="#1a1524" />
                    <stop offset="1" stopColor="#241a2c" />
                </linearGradient>
                <pattern id={g('hatch')} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="2" />
                </pattern>
                <filter id={g('glow')} x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="6" />
                </filter>
            </defs>

            <rect width="1000" height="1000" fill={`url(#${g('sea')})`} />
            {Array.from({ length: 19 }).map((_, i) => (
                <g key={i} stroke="#34b6ff" strokeOpacity="0.05">
                    <line x1={(i + 1) * 50} y1="0" x2={(i + 1) * 50} y2="1000" />
                    <line x1="0" y1={(i + 1) * 50} x2="1000" y2={(i + 1) * 50} />
                </g>
            ))}

            {[34, 20, 9].map((d, i) => (
                <path key={d} d={LAND_PATH} fill="none" stroke="#34b6ff" strokeOpacity={0.05 + i * 0.04} strokeWidth={d} strokeLinejoin="round" />
            ))}
            <path d={LAND_PATH} fill="#ff2e88" opacity="0.18" filter={`url(#${g('glow')})`} />
            <path d={LAND_PATH} fill={`url(#${g('land')})`} />
            <path d={LAND_PATH} fill={`url(#${g('hatch')})`} />
            <path d={LAND_PATH} fill="none" stroke="#ff2e88" strokeOpacity="0.55" strokeWidth="1.6" strokeLinejoin="round" />

            {KEYS.map(([x, y, r], i) => (
                <g key={i}>
                    <ellipse cx={x} cy={y} rx={r + 10} ry={r * 0.6 + 8} fill="none" stroke="#34b6ff" strokeOpacity="0.12" strokeWidth="8" />
                    <ellipse cx={x} cy={y} rx={r} ry={r * 0.55} fill={`url(#${g('land')})`} stroke="#ff2e88" strokeOpacity="0.5" strokeWidth="1.4" />
                </g>
            ))}
            <path d="M726 872 Q690 884 452 946" fill="none" stroke="#f5efe6" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 6" />

            <g transform="translate(905 905)" opacity="0.7">
                <circle r="44" fill="none" stroke="#f5efe6" strokeOpacity="0.25" />
                <path d="M0 -40 L8 0 L0 40 L-8 0Z" fill="#f5efe6" fillOpacity="0.15" />
                <path d="M0 -40 L8 0 L-8 0Z" fill="#ff2e88" />
                <text y="-50" textAnchor="middle" fontSize="16" fill="#f5efe6" fillOpacity="0.6" fontFamily="var(--font-sans)">
                    N
                </text>
            </g>
            <text x="60" y="960" fontSize="15" fill="#f5efe6" fillOpacity="0.35" letterSpacing="4" fontFamily="var(--font-sans)">
                LEONIDA · SCHEMATIC · NOT TO SCALE
            </text>
        </svg>
    );
}

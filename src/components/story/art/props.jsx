import React from 'react';

/** Small reusable SVG props for the scenes. All original, all inline. */

export const SKY = [
  ['#bfe6ff', '#ffe8c7'], // Mon morning
  ['#9ad1ff', '#fff3d9'], // Tue afternoon
  ['#8cc8ff', '#ffefd2'], // Wed afternoon
  ['#b8c4d6', '#e8e2f1'], // Thu grey morning
  ['#ff9966', '#6d28d9'], // Fri sunset
  ['#ffd48a', '#ff9f8f'], // Weekend golden hour
];

export function Sky({ id, day, x = 0, y = 0, w = 1600, h = 900 }) {
  const [a, b] = SKY[day] ?? SKY[0];
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
    </g>
  );
}

/** A Hyderabad-ish skyline: domes, a four-minaret arch, towers. Original shapes. */
export function Skyline({ x = 0, y = 0, s = 1, color = '#6d5a8f', opacity = 0.55 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color} opacity={opacity}>
      <rect x="0" y="-80" width="60" height="80" />
      <rect x="70" y="-130" width="40" height="130" />
      <rect x="120" y="-60" width="70" height="60" />
      {/* four-minaret arch */}
      <g transform="translate(210 0)">
        <rect x="0" y="-150" width="14" height="150" /><rect x="96" y="-150" width="14" height="150" />
        <circle cx="7" cy="-154" r="9" /><circle cx="103" cy="-154" r="9" />
        <path d="M10,-100 L100,-100 L100,0 L72,0 Q55,-60 38,0 L10,0 Z" />
        <ellipse cx="55" cy="-104" rx="22" ry="12" />
      </g>
      <rect x="340" y="-95" width="55" height="95" />
      <rect x="405" y="-150" width="34" height="150" />
      <path d="M450,0 L450,-70 Q480,-110 510,-70 L510,0 Z" />
      <rect x="520" y="-110" width="60" height="110" />
    </g>
  );
}

export function Cloud({ x, y, s = 1, className }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.85">
        <ellipse cx="0" cy="0" rx="50" ry="22" /><ellipse cx="34" cy="-12" rx="34" ry="24" /><ellipse cx="-30" cy="-8" rx="26" ry="18" />
      </g>
    </g>
  );
}

export function StringLights({ x1, x2, y, sag = 40, n = 14, calm }) {
  const pts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [x1 + (x2 - x1) * t, y + sag * 4 * t * (1 - t)];
  });
  const colors = ['#fde047', '#f472b6', '#5eead4', '#c4b5fd'];
  return (
    <g>
      <path d={`M${x1},${y} Q${(x1 + x2) / 2},${y + sag * 2} ${x2},${y}`} fill="none" stroke="#3f3a52" strokeWidth="2" opacity="0.6" />
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py + 6} r="7" fill={colors[i % 4]} className={calm ? undefined : `pp-twinkle pp-d${i % 4}`} />
      ))}
    </g>
  );
}

/** A jar that fills to `fill` (0–1). */
export function Jar({ x, y, w = 80, h = 100, fill = 0, color = '#14b8a6', label, id }) {
  const f = Math.max(0, Math.min(1, fill));
  return (
    <g>
      <defs><clipPath id={id}><rect x={x} y={y} width={w} height={h} rx="16" /></clipPath></defs>
      <rect x={x} y={y} width={w} height={h} rx="16" fill="#f8fafc" fillOpacity="0.75" stroke="#94a3b8" strokeWidth="3" />
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={y + h * (1 - f)} width={w} height={h * f} fill={color} className="pp-fill" style={{ transformOrigin: `${x}px ${y + h}px` }} />
        {f > 0.05 && Array.from({ length: Math.min(6, Math.ceil(f * 6)) }, (_, i) => (
          <circle key={i} cx={x + 16 + (i % 3) * 24} cy={y + h - 12 - Math.floor(i / 3) * 14} r="8" fill="#fde047" stroke="#ca8a04" strokeWidth="2" />
        ))}
      </g>
      <rect x={x + 8} y={y - 12} width={w - 16} height="14" rx="4" fill="#64748b" />
      {label && <text x={x + w / 2} y={y + h + 26} textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b2f5c">{label}</text>}
    </g>
  );
}

/** Goal items, drawn. `kind` is the goal id from content. */
export function GoalGlyph({ kind, x, y, s = 1 }) {
  const g = (children) => <g transform={`translate(${x} ${y}) scale(${s})`}>{children}</g>;
  switch (kind) {
    case 'controller':
      return g(<g><path d="M-60,-10 Q-70,40 -40,44 Q-25,46 -15,24 L15,24 Q25,46 40,44 Q70,40 60,-10 Q50,-30 20,-26 L-20,-26 Q-50,-30 -60,-10 Z" fill="#1e1b4b" /><circle cx="-34" cy="2" r="10" fill="#7c3aed" /><g fill="#5eead4"><circle cx="34" cy="-6" r="6" /><circle cx="46" cy="6" r="6" /><circle cx="22" cy="6" r="6" /><circle cx="34" cy="18" r="6" /></g></g>);
    case 'boots':
      return g(<g><path d="M-50,-40 L-10,-40 L-6,0 Q40,2 56,18 Q60,30 50,32 L-52,32 Q-58,0 -50,-40 Z" fill="#0f766e" /><path d="M-6,0 L40,6" stroke="#5eead4" strokeWidth="5" /><g fill="#111">{[-40, -20, 0, 20, 40].map((cx) => <rect key={cx} x={cx - 4} y="32" width="8" height="10" rx="2" />)}</g></g>);
    case 'tablet':
      return g(<g><rect x="-60" y="-40" width="120" height="80" rx="10" fill="#1e1b4b" /><rect x="-48" y="-30" width="96" height="60" rx="4" fill="#a78bfa" /><path d="M-30,10 Q-10,-20 10,4 T40,-10" fill="none" stroke="#fff" strokeWidth="4" /><rect x="58" y="-46" width="8" height="70" rx="4" fill="#f472b6" transform="rotate(25 62 -10)" /></g>);
    case 'kit':
      return g(<g><rect x="-40" y="-30" width="80" height="64" rx="12" fill="#64748b" /><rect x="-28" y="-16" width="56" height="26" rx="6" fill="#0f172a" /><circle cx="-12" cy="-3" r="6" fill="#5eead4" /><circle cx="12" cy="-3" r="6" fill="#5eead4" /><line x1="0" y1="-30" x2="0" y2="-50" stroke="#64748b" strokeWidth="5" /><circle cx="0" cy="-54" r="7" fill="#f43f5e" /><rect x="-56" y="-6" width="14" height="30" rx="5" fill="#475569" /><rect x="42" y="-6" width="14" height="30" rx="5" fill="#475569" /></g>);
    default: // headphones
      return g(<g fill="none"><path d="M-46,10 Q-50,-56 0,-58 Q50,-56 46,10" stroke="#1e1b4b" strokeWidth="12" strokeLinecap="round" /><rect x="-62" y="0" width="30" height="48" rx="12" fill="#7c3aed" /><rect x="32" y="0" width="30" height="48" rx="12" fill="#7c3aed" /><rect x="-56" y="8" width="10" height="32" rx="4" fill="#c4b5fd" /><rect x="46" y="8" width="10" height="32" rx="4" fill="#c4b5fd" /></g>);
  }
}

/** A small shop box with a sticker, for deals and alternatives on shelves. */
export function ProductBox({ x, y, w = 110, h = 90, color = '#f472b6', sticker, glyph }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={color} />
      <rect x={x} y={y} width={w} height="18" rx="8" fill="#fff" opacity="0.35" />
      <text x={x + w / 2} y={y + h / 2 + 16} textAnchor="middle" fontSize="40">{glyph}</text>
      {sticker && (
        <g>
          <circle cx={x + w - 6} cy={y + 6} r="22" fill="#facc15" stroke="#b45309" strokeWidth="2" />
          <text x={x + w - 6} y={y + 12} textAnchor="middle" fontSize="15" fontWeight="900" fill="#7c2d12">{sticker}</text>
        </g>
      )}
    </g>
  );
}

export function Plant({ x, y, happy = true }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-34,0 L-26,-60 L26,-60 L34,0 Z" fill="#c2410c" />
      <rect x="-30" y="-66" width="60" height="10" rx="3" fill="#9a3412" />
      {happy ? (
        <g fill="#16a34a" className="pp-sway">
          <ellipse cx="-20" cy="-100" rx="14" ry="38" transform="rotate(-25 -20 -100)" />
          <ellipse cx="20" cy="-100" rx="14" ry="38" transform="rotate(25 20 -100)" />
          <ellipse cx="0" cy="-118" rx="13" ry="44" />
        </g>
      ) : (
        <g fill="#84cc16">
          <ellipse cx="-26" cy="-76" rx="12" ry="30" transform="rotate(-70 -26 -76)" />
          <ellipse cx="26" cy="-76" rx="12" ry="30" transform="rotate(70 26 -76)" />
          <ellipse cx="0" cy="-90" rx="10" ry="28" transform="rotate(20 0 -90)" />
        </g>
      )}
    </g>
  );
}

export function Cycle({ x, y, broken, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill="none" stroke="#1f2937" strokeWidth="8">
        <circle cx="-70" cy="0" r="52" />
        <circle cx="70" cy="0" r="52" strokeDasharray={broken ? '30 10' : undefined} />
      </g>
      <g stroke="#94a3b8" strokeWidth="2">{[0, 45, 90, 135].map((a) => (
        <g key={a}><line x1={-70 - 48 * Math.cos(a * Math.PI / 180)} y1={-48 * Math.sin(a * Math.PI / 180)} x2={-70 + 48 * Math.cos(a * Math.PI / 180)} y2={48 * Math.sin(a * Math.PI / 180)} /><line x1={70 - 48 * Math.cos(a * Math.PI / 180)} y1={-48 * Math.sin(a * Math.PI / 180)} x2={70 + 48 * Math.cos(a * Math.PI / 180)} y2={48 * Math.sin(a * Math.PI / 180)} /></g>
      ))}</g>
      <g fill="none" stroke="#0d9488" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-70,0 L-20,-70 L50,-70 L70,0 M-20,-70 L0,0 L50,-70 M0,0 L-70,0" />
        <path d="M50,-70 L44,-96 L68,-100" />
        <path d="M-20,-70 L-28,-92" />
      </g>
      <rect x="-48" y="-100" width="40" height="10" rx="5" fill="#111827" />
      {broken ? (
        <g>
          <path d="M0,0 Q-20,30 -50,20 Q-30,45 -10,40" fill="none" stroke="#6b7280" strokeWidth="4" strokeDasharray="5 4" />
          <g transform="translate(110 -110)"><circle r="22" fill="#ef4444" /><text y="9" textAnchor="middle" fontSize="28" fontWeight="900" fill="#fff">!</text></g>
        </g>
      ) : (
        <path d="M0,0 Q-35,18 -70,0" fill="none" stroke="#6b7280" strokeWidth="4" strokeDasharray="5 4" />
      )}
    </g>
  );
}

/** Polaroids for collected memories on the corkboard. */
export const MEMORY_ART = {
  first_plan: { c: '#a78bfa', g: '📋' }, movie_night: { c: '#f472b6', g: '🍿' }, chai_walk: { c: '#fb923c', g: '☕' },
  smart_wait: { c: '#5eead4', g: '⏳' }, safety_net: { c: '#2dd4bf', g: '🛟' }, akka_loan: { c: '#fda4af', g: '🤝' },
  scam_radar: { c: '#fbbf24', g: '🛡️' }, scam_recovery: { c: '#fcd34d', g: '📞' }, helping_arjun: { c: '#60a5fa', g: '🫂' },
  stall_hustle: { c: '#86efac', g: '🌼' }, debt_free: { c: '#c4b5fd', g: '✅' }, goal_unlocked: { c: '#7c3aed', g: '🏆' }, snowball: { c: '#93c5fd', g: '❄️' },
};

export function Polaroid({ x, y, rot = 0, id }) {
  const m = MEMORY_ART[id] ?? { c: '#e2e8f0', g: '✨' };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} className="pp-pop">
      <rect x="-30" y="-36" width="60" height="70" rx="3" fill="#fff" stroke="#e5e7eb" />
      <rect x="-24" y="-30" width="48" height="44" fill={m.c} />
      <text x="0" y="1" textAnchor="middle" fontSize="26">{m.g}</text>
      <circle cx="0" cy="-36" r="5" fill="#ef4444" />
    </g>
  );
}

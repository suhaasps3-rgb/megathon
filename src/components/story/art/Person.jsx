import React from 'react';

/**
 * Original SVG characters. Feet sit at (0,0); a person is ~300 units tall. Mood changes
 * the face and posture, so reactions read without any text.
 */
export const SKINS = ['#f3cfa6', '#dba476', '#b57749', '#7a4a2c'];
export const HAIRS = ['crop', 'curly', 'long', 'bun'];
export const TOPS = ['#7c3aed', '#0d9488', '#ea580c', '#1e293b'];

export const CAST = {
  akka: { skin: '#c98b5e', hair: 'braid', hairColor: '#1c1412', top: '#e11d48', pants: '#fde68a', acc: ['bindi', 'studs'], kurta: true },
  zoya: { skin: '#e3ae84', hair: 'curly', hairColor: '#3b2416', top: '#facc15', pants: '#334155', acc: ['hoops'] },
  arjun: { skin: '#a8683f', hair: 'crop', hairColor: '#111827', top: '#2563eb', pants: '#1f2937', acc: ['glasses'] },
  raju: { skin: '#b07850', hair: 'bald', hairColor: '#3f3f46', top: '#f1f5f9', pants: '#475569', acc: ['mustache', 'vest'] },
  aunty: { skin: '#8d5a3b', hair: 'bun', hairColor: '#111', top: '#15803d', pants: '#15803d', acc: ['bindi', 'jasmine', 'saree'] },
};

export function playerLook(look = {}) {
  return {
    skin: SKINS[look.skin ?? 0] ?? SKINS[0],
    hair: HAIRS[look.hair ?? 0] ?? HAIRS[0],
    hairColor: '#1f1a17',
    top: TOPS[look.outfit ?? 0] ?? TOPS[0],
    pants: '#25324a',
    acc: [],
  };
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function HairBack({ style, color }) {
  if (style === 'long') return <path d="M-48,-250 Q-56,-180 -46,-168 L46,-168 Q56,-180 48,-250 Z" fill={color} />;
  if (style === 'braid') return (
    <g fill={color}>
      <path d="M-46,-250 Q-50,-205 -40,-196 L40,-196 Q50,-205 46,-250 Z" />
      {[0, 1, 2, 3].map((i) => <ellipse key={i} cx={34 + i * 2} cy={-188 + i * 20} rx="10" ry="12" />)}
      <circle cx="42" cy="-110" r="5" fill="#f43f5e" />
    </g>
  );
  if (style === 'curly') return (
    <g fill={color}>
      {[-50, -38, 38, 50].map((x, i) => <circle key={i} cx={x} cy={-228 + (i % 2) * 14} r="17" />)}
    </g>
  );
  return null;
}

function HairFront({ style, color }) {
  const c = color;
  switch (style) {
    case 'curly':
      return (
        <g fill={c}>
          {[-40, -24, -8, 8, 24, 40].map((x, i) => <circle key={i} cx={x} cy={-282 + Math.abs(x) * 0.35} r="18" />)}
          <circle cx="-46" cy="-258" r="13" /><circle cx="46" cy="-258" r="13" />
        </g>
      );
    case 'long':
      return <path fill={c} d="M-46,-238 Q-50,-298 0,-296 Q50,-298 46,-238 Q42,-262 22,-266 Q8,-252 -12,-268 Q-34,-266 -46,-238 Z" />;
    case 'bun':
      return (
        <g fill={c}>
          <circle cx="0" cy="-298" r="18" />
          <path d="M-45,-240 Q-48,-296 0,-294 Q48,-296 45,-240 Q40,-272 0,-276 Q-40,-272 -45,-240 Z" />
        </g>
      );
    case 'braid':
      return <path fill={c} d="M-45,-240 Q-48,-296 0,-294 Q48,-296 45,-240 Q38,-270 4,-278 L0,-268 L-4,-278 Q-38,-270 -45,-240 Z" />;
    case 'bald':
      return (
        <g fill={c}>
          <path d="M-44,-236 Q-46,-262 -36,-270 L-34,-244 Z" /><path d="M44,-236 Q46,-262 36,-270 L34,-244 Z" />
        </g>
      );
    default: // crop
      return <path fill={c} d="M-45,-242 Q-48,-298 0,-296 Q48,-298 45,-242 Q42,-266 20,-270 Q-6,-258 -20,-272 Q-40,-268 -45,-242 Z" />;
  }
}

function Face({ mood, skin }) {
  const ink = '#1e1b2e';
  const eyes = (() => {
    if (mood === 'happy' || mood === 'excited') {
      return <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round"><path d="M-22,-244 Q-15,-252 -8,-244" /><path d="M8,-244 Q15,-252 22,-244" /></g>;
    }
    if (mood === 'smug') {
      return <g fill={ink}><rect x="-21" y="-247" width="12" height="5" rx="2" /><rect x="9" y="-247" width="12" height="5" rx="2" /></g>;
    }
    return <g fill={ink}><ellipse cx="-15" cy="-245" rx="4.5" ry="6" /><ellipse cx="15" cy="-245" rx="4.5" ry="6" /><circle cx="-13.5" cy="-247" r="1.5" fill="#fff" /><circle cx="16.5" cy="-247" r="1.5" fill="#fff" /></g>;
  })();
  const brows = {
    worried: ['M-24,-256 L-8,-262', 'M8,-262 L24,-256'],
    sad: ['M-24,-256 L-8,-262', 'M8,-262 L24,-256'],
    smug: ['M-24,-262 L-8,-260', 'M8,-264 L24,-258'],
    excited: ['M-24,-264 L-8,-266', 'M8,-266 L24,-264'],
  }[mood] ?? ['M-24,-260 L-8,-261', 'M8,-261 L24,-260'];
  const mouth = {
    happy: <path d="M-12,-224 Q0,-212 12,-224" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />,
    excited: <path d="M-13,-226 Q0,-206 13,-226 Z" fill="#7f1d1d" stroke={ink} strokeWidth="3" strokeLinejoin="round" />,
    worried: <path d="M-11,-220 Q-5,-226 0,-220 Q5,-214 11,-220" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />,
    sad: <path d="M-11,-216 Q0,-226 11,-216" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />,
    smug: <path d="M-10,-222 Q4,-218 13,-228" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />,
  }[mood] ?? <path d="M-8,-221 L8,-221" stroke={ink} strokeWidth="4" strokeLinecap="round" />;
  return (
    <g>
      {eyes}
      <g stroke={ink} strokeWidth="3.5" strokeLinecap="round">{brows.map((d) => <path key={d} d={d} />)}</g>
      <path d="M-2,-238 Q-4,-230 2,-230" fill="none" stroke={shade(skin, -40)} strokeWidth="2.5" strokeLinecap="round" />
      {(mood === 'happy' || mood === 'excited') && <g fill="#fb7185" opacity="0.35"><ellipse cx="-27" cy="-229" rx="8" ry="5" /><ellipse cx="27" cy="-229" rx="8" ry="5" /></g>}
      {mouth}
    </g>
  );
}

/**
 * @param {{ x?: number, y?: number, s?: number, look: object, mood?: string, flip?: boolean, idle?: boolean, label?: string }} props
 */
export default function Person({ x = 0, y = 0, s = 1, look, mood = 'neutral', flip = false, idle = true, label }) {
  const { skin, hair, hairColor, top, pants, acc = [], kurta } = look;
  const has = (a) => acc.includes(a);
  const skinDark = shade(skin, -28);
  const topDark = shade(top, -35);
  const raised = mood === 'excited';
  const slump = mood === 'sad' || mood === 'worried';
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} aria-label={label} role={label ? 'img' : undefined}>
      <ellipse cx="0" cy="2" rx="62" ry="10" fill="#000" opacity="0.14" />
      <g className={idle ? 'pp-breathe' : undefined}>
        {/* legs */}
        {has('saree') ? (
          <path d="M-46,-110 L-54,-2 L54,-2 L46,-110 Z" fill={top} />
        ) : (
          <g fill={pants}>
            <rect x="-30" y="-112" width="27" height="108" rx="10" />
            <rect x="3" y="-112" width="27" height="108" rx="10" />
          </g>
        )}
        <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2">
          <ellipse cx="-17" cy="-5" rx="21" ry="9" />
          <ellipse cx="17" cy="-5" rx="21" ry="9" />
        </g>
        <HairBack style={hair} color={hairColor} />
        {/* torso */}
        <g transform={slump ? 'translate(0 4)' : undefined}>
          <path d={kurta ? 'M-54,-60 Q-60,-168 -40,-190 Q0,-202 40,-190 Q60,-168 54,-60 Z' : 'M-56,-98 Q-62,-170 -40,-192 Q0,-204 40,-192 Q62,-170 56,-98 Z'} fill={top} />
          {!kurta && !has('vest') && !has('saree') && (
            <g>
              <path d="M-34,-128 L34,-128 L28,-104 L-28,-104 Z" fill={topDark} opacity="0.5" />
              <path d="M-26,-192 Q0,-168 26,-192" fill="none" stroke={topDark} strokeWidth="6" />
              <line x1="-8" y1="-182" x2="-10" y2="-150" stroke="#f8fafc" strokeWidth="3" />
              <line x1="8" y1="-182" x2="10" y2="-150" stroke="#f8fafc" strokeWidth="3" />
            </g>
          )}
          {kurta && <path d="M-6,-192 L0,-150 L6,-192" fill="none" stroke="#fde68a" strokeWidth="4" />}
          {has('vest') && <path d="M-50,-104 Q-54,-168 -34,-188 L-12,-188 L-8,-104 Z M50,-104 Q54,-168 34,-188 L12,-188 L8,-104 Z" fill="#475569" />}
          {has('saree') && <path d="M-40,-192 Q10,-150 50,-60 L60,-80 Q30,-160 -20,-196 Z" fill="#facc15" opacity="0.85" />}
          {/* arms */}
          <g stroke={top} strokeWidth="24" strokeLinecap="round" fill="none">
            <path d={raised ? 'M-48,-178 Q-80,-220 -66,-262' : slump ? 'M-48,-176 Q-66,-140 -54,-104' : 'M-48,-178 Q-74,-150 -64,-110'} />
            <path d="M48,-178 Q74,-150 64,-110" />
          </g>
          <circle cx={raised ? -66 : slump ? -54 : -64} cy={raised ? -270 : slump ? -100 : -104} r="12" fill={skin} />
          <circle cx="64" cy="-104" r="12" fill={skin} />
          {/* neck + head */}
          <rect x="-11" y="-212" width="22" height="24" rx="6" fill={skinDark} />
          <circle cx="-43" cy="-242" r="9" fill={skin} />
          <circle cx="43" cy="-242" r="9" fill={skin} />
          <ellipse cx="0" cy="-245" rx="43" ry="47" fill={skin} />
          <Face mood={mood} skin={skin} />
          <HairFront style={hair} color={hairColor} />
          {has('bindi') && <circle cx="0" cy="-266" r="3.5" fill="#be123c" />}
          {has('studs') && <g fill="#fde047"><circle cx="-44" cy="-232" r="3" /><circle cx="44" cy="-232" r="3" /></g>}
          {has('hoops') && <g fill="none" stroke="#fbbf24" strokeWidth="3"><circle cx="-45" cy="-226" r="7" /><circle cx="45" cy="-226" r="7" /></g>}
          {has('jasmine') && <g fill="#fff">{[-14, -6, 2, 10, 18].map((x2) => <circle key={x2} cx={x2} cy={-310 + Math.abs(x2) * 0.2} r="4" />)}</g>}
          {has('mustache') && <path d="M-18,-229 Q-8,-236 0,-230 Q8,-236 18,-229 Q8,-224 0,-227 Q-8,-224 -18,-229 Z" fill="#27272a" />}
          {has('glasses') && (
            <g fill="#e0f2fe" fillOpacity="0.35" stroke="#0f172a" strokeWidth="3.5">
              <rect x="-29" y="-256" width="24" height="20" rx="6" />
              <rect x="5" y="-256" width="24" height="20" rx="6" />
              <line x1="-5" y1="-247" x2="5" y2="-247" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

/** Head-and-shoulders portrait for dialogue. */
export function Portrait({ look, mood, size = 56, label }) {
  return (
    <svg viewBox="-70 -320 140 150" width={size} height={size * (150 / 140)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Person look={look} mood={mood} idle={false} />
    </svg>
  );
}

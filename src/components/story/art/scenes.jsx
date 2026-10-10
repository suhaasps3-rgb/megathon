import React from 'react';
import Person, { CAST } from './Person.jsx';
import { Sky, Skyline, Cloud, StringLights, Jar, GoalGlyph, ProductBox, Plant, Cycle, Polaroid } from './props.jsx';

/**
 * The three places. Each scene is drawn on a 1600×900 canvas; anything interactive is
 * kept between x=200 and x=1400 so it stays on screen when phones crop the sides.
 * Scenes only draw what the game state says: jar levels, bought items, the cycle, the
 * corkboard of memories and everyone's expressions all come from props.
 */

const INK = '#2a2140';

function Ground({ y, color, line }) {
  return (
    <g>
      <rect x="0" y={y} width="1600" height={900 - y} fill={color} />
      {line && <rect x="0" y={y} width="1600" height="6" fill={line} />}
    </g>
  );
}

/* ───────────────────────────── Home ───────────────────────────── */
export function HomeScene({ s }) {
  const { day, look, mood, calm, memories, jarFill, safetyFill, goalKind, goalPct, goalBought, dealBought, cycle, unread, akkaMood, plantHappy, dayIndexLabel } = s;
  const evening = day === 4 || day === 5;
  return (
    <svg viewBox="0 0 1600 900" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="homeWall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={evening ? '#e9dcff' : '#f1e9ff'} />
          <stop offset="1" stopColor={evening ? '#ffd9c9' : '#ffeedd'} />
        </linearGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="680" fill="url(#homeWall)" />
      {/* wall pattern */}
      <g opacity="0.07" fill="#7c3aed">{Array.from({ length: 16 }, (_, i) => <circle key={i} cx={60 + i * 100} cy={i % 2 ? 470 : 500} r="5" />)}</g>
      {/* floor */}
      <rect y="660" width="1600" height="240" fill="#c99566" />
      <g stroke="#b07f53" strokeWidth="3">{[700, 750, 810, 880].map((y) => <line key={y} x1="0" x2="1600" y1={y} y2={y} />)}</g>
      <rect y="652" width="1600" height="14" fill="#8b5e3c" />
      <ellipse cx="800" cy="800" rx="380" ry="62" fill="#5b21b6" opacity="0.85" />
      <ellipse cx="800" cy="800" rx="320" ry="46" fill="none" stroke="#5eead4" strokeWidth="6" strokeDasharray="18 12" />

      {/* door (decor, left edge) */}
      <rect x="30" y="170" width="160" height="490" rx="6" fill="#a16207" />
      <rect x="50" y="195" width="120" height="200" rx="4" fill="#ca8a04" opacity="0.5" />
      <rect x="50" y="420" width="120" height="210" rx="4" fill="#ca8a04" opacity="0.5" />
      <circle cx="165" cy="420" r="8" fill="#fde68a" />

      {/* window with the city */}
      <g>
        <rect x="640" y="80" width="280" height="300" rx="12" fill="#5b4b7a" />
        <svg x="652" y="92" width="256" height="276" viewBox="0 0 256 276">
          <Sky id="homeSky" day={day} w={256} h={276} />
          {!calm && <Cloud x={70} y={60} s={0.7} className="pp-drift" />}
          {!calm && <Cloud x={190} y={100} s={0.5} className="pp-drift pp-d2" />}
          <circle cx={day === 4 ? 128 : 200} cy={day === 4 ? 210 : 50} r="22" fill={day === 4 ? '#fb923c' : '#fde68a'} />
          <Skyline x={-30} y={276} s={0.5} color="#4c3d73" opacity={0.6} />
        </svg>
        <line x1="780" y1="92" x2="780" y2="368" stroke="#5b4b7a" strokeWidth="8" />
        <path d="M630,70 Q660,240 620,400 L600,400 L600,70 Z" fill="#14b8a6" />
        <path d="M930,70 Q900,240 940,400 L960,400 L960,70 Z" fill="#14b8a6" />
        <rect x="596" y="60" width="368" height="14" rx="6" fill="#3f3a52" />
      </g>

      <StringLights x1={220} x2={1380} y={40} sag={18} n={18} calm={calm} />

      {/* calendar */}
      <g>
        <rect x="230" y="140" width="110" height="140" rx="8" fill="#fff" stroke="#c4b5fd" strokeWidth="3" />
        <rect x="230" y="140" width="110" height="34" rx="8" fill="#7c3aed" />
        <text x="285" y="164" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">{dayIndexLabel}</text>
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <rect x={244 + (i % 3) * 30} y={188 + Math.floor(i / 3) * 42} width="22" height="30" rx="4" fill={i < day ? '#99f6e4' : i === day ? '#fde047' : '#ede9fe'} />
            {i < day && <path d={`M${249 + (i % 3) * 30},${203 + Math.floor(i / 3) * 42} l5,6 l9,-12`} fill="none" stroke="#0f766e" strokeWidth="3" />}
          </g>
        ))}
      </g>

      {/* goal poster */}
      <g>
        <rect x="380" y="100" width="170" height="210" rx="10" fill="#1e1b4b" />
        <rect x="392" y="112" width="146" height="150" rx="6" fill={goalBought ? '#5eead4' : '#312e81'} />
        <text x="465" y="140" textAnchor="middle" fontSize="18" fontWeight="900" fill="#c4b5fd" letterSpacing="3">GOAL</text>
        <GoalGlyph kind={goalKind} x={465} y={205} s={0.8} />
        <rect x="396" y="276" width="138" height="16" rx="8" fill="#4338ca" />
        <rect x="396" y="276" width={Math.max(16, 138 * goalPct / 100)} height="16" rx="8" fill="#5eead4" className="pp-grow" />
      </g>

      {/* shelf with jars */}
      <rect x="360" y="440" width="230" height="16" rx="4" fill="#8b5e3c" />
      <Jar id="jarGoal" x={378} y={332} w={86} h={104} fill={jarFill} color="#8b5cf6" />
      <Jar id="jarSafety" x={482} y={332} w={86} h={104} fill={safetyFill} color="#14b8a6" />

      {/* corkboard of memories */}
      <g>
        <rect x="960" y="100" width="230" height="200" rx="8" fill="#8b5a2b" />
        <rect x="972" y="112" width="206" height="176" rx="4" fill="#d9a066" />
        {memories.slice(0, 6).map((m, i) => (
          <Polaroid key={m} id={m} x={1010 + (i % 3) * 66} y={160 + Math.floor(i / 3) * 84} rot={(i % 2 ? 6 : -5)} />
        ))}
      </g>

      {/* bed */}
      <g>
        <rect x="200" y="520" width="270" height="120" rx="12" fill="#7c3aed" />
        <rect x="190" y="470" width="24" height="190" rx="8" fill="#6d28d9" />
        <rect x="214" y="500" width="90" height="40" rx="16" fill="#f8fafc" />
        <path d="M300,530 Q380,505 470,528 L470,600 L300,600 Z" fill="#14b8a6" />
        <path d="M300,560 L470,560" stroke="#5eead4" strokeWidth="6" strokeDasharray="14 10" />
        <rect x="200" y="630" width="270" height="18" rx="6" fill="#4c1d95" />
      </g>

      {/* desk */}
      <g>
        <ellipse cx="1310" cy="430" rx="160" ry="120" fill="url(#lampGlow)" />
        <rect x="1080" y="530" width="320" height="22" rx="6" fill="#92400e" />
        <rect x="1094" y="552" width="16" height="108" fill="#78350f" />
        <rect x="1370" y="552" width="16" height="108" fill="#78350f" />
        {/* phone, glowing when there are new messages */}
        <rect x="1104" y="486" width="34" height="46" rx="6" fill="#0f172a" />
        <rect x="1108" y="490" width="26" height="36" rx="3" fill={unread ? '#a78bfa' : '#334155'} className={unread && !calm ? 'pp-glowpulse' : undefined} />
        {unread > 0 && <g><circle cx="1140" cy="484" r="13" fill="#ef4444" /><text x="1140" y="490" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">{unread}</text></g>}
        {/* wallet */}
        <rect x="1160" y="500" width="62" height="32" rx="6" fill="#065f46" />
        <rect x="1166" y="494" width="44" height="10" rx="2" fill="#86efac" />
        {/* laptop */}
        <path d="M1250,530 L1366,530 L1376,540 L1240,540 Z" fill="#475569" />
        <rect x="1258" y="448" width="100" height="82" rx="6" fill="#1e293b" />
        <rect x="1264" y="454" width="88" height="68" rx="3" fill={day === 5 ? '#5eead4' : '#334155'} />
        {day === 5 && <path d="M1270,512 Q1290,500 1306,506 T1346,470" fill="none" stroke="#0f766e" strokeWidth="4" />}
        <rect x="1300" y="436" width="40" height="10" rx="2" fill="#fde047" transform="rotate(-6 1320 441)" />
        {/* lamp */}
        <rect x="1374" y="520" width="24" height="10" rx="3" fill="#475569" />
        <rect x="1382" y="458" width="6" height="64" fill="#475569" />
        <path d="M1360,460 L1410,460 L1396,430 L1374,430 Z" fill="#fbbf24" />
        {/* bought deal sits on the desk */}
        {dealBought && <g><rect x="1226" y="502" width="26" height="28" rx="5" fill="#f472b6" /><text x="1239" y="523" textAnchor="middle" fontSize="16">✨</text></g>}
      </g>

      {/* hobby corner */}
      <HobbyCorner kind={goalKind} x={590} y={650} />

      {/* the goal, once bought, takes pride of place */}
      {goalBought && (
        <g className="pp-pop">
          <ellipse cx="465" cy="470" rx="60" ry="10" fill="#7c3aed" opacity="0.25" />
          <GoalGlyph kind={goalKind} x={465} y={410} s={0.6} />
        </g>
      )}

      {/* cycle */}
      <Cycle x={1210} y={720} s={0.78} broken={cycle === 'broken'} />

      <Plant x={1500} y={660} happy={plantHappy} />

      {/* people */}
      <Person x={960} y={760} s={0.92} look={CAST.akka} mood={akkaMood} idle={!calm} />
      <Person x={760} y={790} s={1} look={look} mood={mood} idle={!calm} />
    </svg>
  );
}

function HobbyCorner({ kind, x, y }) {
  switch (kind) {
    case 'controller':
      return (<g transform={`translate(${x} ${y})`}><rect x="-10" y="-120" width="100" height="70" rx="6" fill="#0f172a" /><rect x="-4" y="-114" width="88" height="56" rx="3" fill="#6366f1" /><rect x="10" y="-50" width="60" height="50" rx="4" fill="#334155" /><GoalGlyph kind="controller" x={40} y={-18} s={0.3} /></g>);
    case 'boots':
      return (<g transform={`translate(${x} ${y})`}><circle cx="40" cy="-34" r="34" fill="#f8fafc" stroke="#0f172a" strokeWidth="4" /><path d="M40,-68 l12,16 -6,20 -14,0 -6,-20 Z M40,0 l-10,-18 M6,-34 l18,4" fill="#0f172a" stroke="#0f172a" strokeWidth="3" /></g>);
    case 'tablet':
      return (<g transform={`translate(${x} ${y})`}><path d="M10,0 L40,-170 L70,0 M40,-170 L40,0" fill="none" stroke="#92400e" strokeWidth="8" /><rect x="0" y="-160" width="80" height="96" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="3" /><circle cx="28" cy="-120" r="16" fill="#f472b6" /><path d="M14,-84 Q40,-110 66,-84" fill="none" stroke="#7c3aed" strokeWidth="6" /></g>);
    case 'kit':
      return (<g transform={`translate(${x} ${y})`}><rect x="0" y="-60" width="90" height="60" rx="6" fill="#334155" /><rect x="8" y="-52" width="74" height="34" rx="3" fill="#16a34a" /><g fill="#fde047">{[16, 32, 48, 64].map((cx) => <circle key={cx} cx={cx} cy="-35" r="3" />)}</g><circle cx="74" cy="-70" r="7" fill="#ef4444" className="pp-twinkle" /></g>);
    default:
      return (<g transform={`translate(${x} ${y})`}><ellipse cx="40" cy="-40" rx="32" ry="38" fill="#b45309" /><circle cx="40" cy="-44" r="10" fill="#451a03" /><rect x="34" y="-190" width="12" height="150" rx="4" fill="#78350f" /><rect x="30" y="-205" width="20" height="24" rx="4" fill="#451a03" /></g>);
  }
}

/* ───────────────────────────── School gate / chai point ───────────────────────────── */
export function HangoutScene({ s }) {
  const { day, look, mood, calm, zoyaMood, arjunMood, showFriends } = s;
  const evening = day === 4;
  return (
    <svg viewBox="0 0 1600 900" className="block h-full w-full" aria-hidden="true">
      <Sky id="hangSky" day={day} />
      {!calm && <><Cloud x={300} y={110} className="pp-drift" /><Cloud x={1100} y={80} s={0.8} className="pp-drift pp-d3" /></>}
      <circle cx={evening ? 1200 : 1350} cy={evening ? 430 : 120} r="46" fill={evening ? '#fb923c' : '#fde68a'} opacity="0.95" />
      <Skyline x={760} y={520} s={1.2} color={evening ? '#3b2a63' : '#7c6ca8'} opacity={0.45} />
      {/* school */}
      <g>
        <rect x="0" y="230" width="640" height="320" fill="#fde7c4" />
        <rect x="0" y="210" width="640" height="30" fill="#c2410c" />
        {[40, 160, 400, 520].map((x) => <g key={x}><rect x={x} y="280" width="80" height="90" rx="4" fill="#38bdf8" opacity="0.6" /><rect x={x} y="400" width="80" height="90" rx="4" fill="#38bdf8" opacity="0.6" /></g>)}
        <path d="M250,550 L250,330 Q320,260 390,330 L390,550 Z" fill="#7c2d12" />
        <rect x="200" y="250" width="240" height="44" rx="6" fill="#0f766e" />
        <text x="320" y="279" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" letterSpacing="1">SUNRISE JR. COLLEGE</text>
      </g>
      {/* road */}
      <Ground y={550} color={evening ? '#6b5d7e' : '#a8a29e'} line="#e7e5e4" />
      <g fill="#fafaf9" opacity="0.7">{[100, 400, 700, 1000, 1300].map((x) => <rect key={x} x={x} y="840" width="140" height="10" rx="5" />)}</g>
      <rect x="0" y="550" width="1600" height="60" fill={evening ? '#7c6f8f' : '#d6d3d1'} />
      {/* notice board */}
      <g>
        <rect x="236" y="390" width="10" height="200" fill="#57534e" /><rect x="370" y="390" width="10" height="200" fill="#57534e" />
        <rect x="220" y="380" width="176" height="130" rx="6" fill="#166534" />
        <rect x="236" y="394" width="70" height="90" fill="#fef9c3" transform="rotate(-4 271 439)" />
        <rect x="312" y="398" width="70" height="60" fill="#fecdd3" transform="rotate(5 347 428)" />
        <text x="271" y="430" textAnchor="middle" fontSize="13" fontWeight="900" fill="#7c2d12" transform="rotate(-4 271 439)">FEST</text>
        <text x="271" y="448" textAnchor="middle" fontSize="11" fill="#7c2d12" transform="rotate(-4 271 439)">SAT</text>
      </g>
      {/* neem tree */}
      <g>
        <rect x="830" y="330" width="40" height="260" rx="10" fill="#78350f" />
        <g fill={evening ? '#14532d' : '#16a34a'} className={calm ? undefined : 'pp-sway'}>
          <circle cx="850" cy="300" r="110" /><circle cx="760" cy="340" r="80" /><circle cx="940" cy="340" r="80" />
        </g>
        <g fill={evening ? '#166534' : '#22c55e'} opacity="0.7"><circle cx="820" cy="270" r="50" /><circle cx="900" cy="300" r="40" /></g>
      </g>
      {/* bunting */}
      <path d="M0,150 Q400,220 800,150 T1600,150" fill="none" stroke="#3f3a52" strokeWidth="2" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 50 + i * 100;
        const y = 150 + 35 * Math.sin((i / 15) * Math.PI * 2 + Math.PI) * -1 * 0.9 + 20;
        return <path key={i} d={`M${x - 22},${y - 10} L${x + 22},${y - 10} L${x},${y + 26} Z`} fill={['#f472b6', '#facc15', '#5eead4', '#a78bfa'][i % 4]} />;
      })}
      {evening && <StringLights x1={1020} x2={1380} y={330} sag={12} n={9} calm={calm} />}
      {/* chai cart */}
      <g>
        <rect x="1030" y="440" width="320" height="150" rx="12" fill="#ea580c" />
        <rect x="1030" y="420" width="320" height="30" rx="8" fill="#9a3412" />
        <path d="M1010,340 L1370,340 L1340,300 L1040,300 Z" fill="#facc15" />
        <g fill="#f97316">{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${1040 + i * 50},340 q25,30 50,0`} />)}</g>
        <rect x="1036" y="340" width="10" height="100" fill="#78350f" /><rect x="1334" y="340" width="10" height="100" fill="#78350f" />
        <text x="1190" y="525" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fff7ed">CHAI ☕ ₹15</text>
        <ellipse cx="1110" cy="410" rx="30" ry="18" fill="#a1a1aa" />
        <rect x="1094" y="380" width="32" height="28" rx="6" fill="#71717a" />
        {!calm && <g fill="#fff" opacity="0.7"><circle cx="1112" cy="360" r="10" className="pp-steam" /><circle cx="1120" cy="350" r="8" className="pp-steam pp-d2" /></g>}
        <circle cx="1080" cy="600" r="26" fill="#1f2937" /><circle cx="1300" cy="600" r="26" fill="#1f2937" />
        {[1200, 1240, 1280].map((x) => <rect key={x} x={x} y="396" width="18" height="24" rx="3" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />)}
      </g>
      {/* auto-rickshaw (decor) */}
      <g transform="translate(1420 640)">
        <path d="M0,0 L0,-120 Q60,-170 150,-130 L170,0 Z" fill="#facc15" />
        <path d="M0,-120 Q60,-170 150,-130 L150,-110 L0,-104 Z" fill="#111827" />
        <rect x="20" y="-96" width="60" height="50" rx="6" fill="#bae6fd" opacity="0.7" />
        <rect x="0" y="-30" width="170" height="20" fill="#16a34a" />
        <circle cx="30" cy="10" r="24" fill="#111827" /><circle cx="150" cy="10" r="24" fill="#111827" />
      </g>
      {/* people */}
      {showFriends && <Person x={720} y={790} s={0.98} look={CAST.zoya} mood={zoyaMood} idle={!calm} />}
      {showFriends && <Person x={930} y={800} s={1.02} look={CAST.arjun} mood={arjunMood} flip idle={!calm} />}
      <Person x={480} y={810} s={1.04} look={look} mood={mood} idle={!calm} />
    </svg>
  );
}

/* ───────────────────────────── Gully Market ───────────────────────────── */
export function MarketScene({ s }) {
  const { day, look, mood, calm, rajuMood, auntyMood, goalKind, dealGlyph, altGlyph, soldDeal } = s;
  return (
    <svg viewBox="0 0 1600 900" className="block h-full w-full" aria-hidden="true">
      <Sky id="mktSky" day={day} />
      <Skyline x={40} y={260} s={1} color="#8b7bb8" opacity={0.35} />
      {/* back buildings */}
      <rect x="0" y="180" width="380" height="420" fill="#f9a8d4" />
      <rect x="1300" y="160" width="300" height="440" fill="#93c5fd" />
      <g fill="#fff" opacity="0.5">{[30, 140, 250].map((x) => <rect key={x} x={x} y="220" width="70" height="80" rx="4" />)}{[1330, 1450].map((x) => <rect key={x} x={x} y="200" width="80" height="90" rx="4" />)}</g>
      {/* wires */}
      <path d="M0,120 Q400,200 800,130 T1600,140" fill="none" stroke="#1f2937" strokeWidth="2" opacity="0.6" />
      <path d="M0,90 Q500,160 1000,100 T1600,110" fill="none" stroke="#1f2937" strokeWidth="2" opacity="0.4" />
      <StringLights x1={0} x2={1600} y={150} sag={30} n={22} calm={calm} />
      {/* Raju's shop */}
      <g>
        <rect x="400" y="200" width="520" height="400" fill="#ede9fe" />
        <rect x="400" y="200" width="520" height="70" fill="#4c1d95" />
        <text x="660" y="246" textAnchor="middle" fontSize="30" fontWeight="900" fill="#fef9c3" letterSpacing="2">RAJU ELECTRONICS</text>
        <g>{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${400 + i * 40},270 l40,0 l0,40 q-20,22 -40,0 Z`} fill={i % 2 ? '#fff' : '#7c3aed'} />)}</g>
        {/* shelves */}
        <rect x="430" y="440" width="460" height="14" fill="#a16207" />
        <rect x="430" y="330" width="460" height="10" fill="#a16207" opacity="0.4" />
        <ProductBox x={450} y={346} w={120} h={92} color="#f472b6" sticker="-40%" glyph={soldDeal ? '' : dealGlyph} />
        <ProductBox x={600} y={356} w={100} h={82} color="#5eead4" glyph={altGlyph} />
        <g><rect x="728" y="338" width="150" height="100" rx="10" fill="#1e1b4b" /><GoalGlyph kind={goalKind} x={803} y={392} s={0.62} /></g>
        <rect x="430" y="560" width="460" height="40" fill="#6d28d9" />
      </g>
      {/* flash sale banner */}
      <g className={calm ? undefined : 'pp-flash'}>
        <rect x="470" y="110" width="380" height="70" rx="10" fill="#ef4444" stroke="#facc15" strokeWidth="5" />
        <text x="660" y="158" textAnchor="middle" fontSize="36" fontWeight="900" fill="#fff" letterSpacing="2">FLASH SALE · TODAY!</text>
      </g>
      {/* flower stall */}
      <g>
        <path d="M960,330 L1320,330 L1290,280 L990,280 Z" fill="#16a34a" />
        <g fill="#fef08a">{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${990 + i * 46},330 q23,26 46,0`} />)}</g>
        <rect x="980" y="520" width="320" height="90" rx="8" fill="#92400e" />
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <path d={`M${1000 + i * 60},340 Q${1020 + i * 60},${440 + (i % 2) * 20} ${1040 + i * 60},340`} fill="none" stroke="#f97316" strokeWidth="14" strokeDasharray="2 10" strokeLinecap="round" />
          </g>
        ))}
        <g fill="#fff">{Array.from({ length: 12 }, (_, i) => <circle key={i} cx={1000 + i * 25} cy={520 - (i % 3) * 6} r="7" />)}</g>
        <g fill="#f59e0b">{Array.from({ length: 8 }, (_, i) => <circle key={i} cx={1010 + i * 38} cy="546" r="14" />)}</g>
      </g>
      {/* street */}
      <Ground y={600} color="#d6c7b0" line="#a8977e" />
      <g fill="#c4b39a">{Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 140} y={700 + (i % 2) * 60} width="90" height="20" rx="8" />)}</g>
      {/* fruit cart (decor, right edge) */}
      <g transform="translate(1420 640)">
        <rect x="0" y="-80" width="170" height="60" rx="8" fill="#15803d" />
        <g>{Array.from({ length: 8 }, (_, i) => <circle key={i} cx={18 + (i % 4) * 40} cy={-90 - Math.floor(i / 4) * 22} r="16" fill={i % 2 ? '#ef4444' : '#f59e0b'} />)}</g>
        <circle cx="30" cy="0" r="22" fill="#1f2937" /><circle cx="140" cy="0" r="22" fill="#1f2937" />
      </g>
      {/* a sleeping street dog */}
      <g transform="translate(250 820)">
        <ellipse cx="0" cy="0" rx="60" ry="24" fill="#b45309" />
        <circle cx="54" cy="-8" r="20" fill="#b45309" />
        <path d="M60,-24 l10,-14 l6,18 Z" fill="#92400e" />
        <path d="M46,-8 q6,4 12,0" stroke="#451a03" strokeWidth="3" fill="none" />
        {!calm && <text x="80" y="-40" fontSize="22" fill="#6b7280" className="pp-steam">z</text>}
      </g>
      {/* people */}
      <Person x={660} y={640} s={0.86} look={CAST.raju} mood={rajuMood} idle={!calm} />
      <Person x={1140} y={650} s={0.86} look={CAST.aunty} mood={auntyMood} idle={!calm} />
      <Person x={420} y={830} s={1.05} look={look} mood={mood} idle={!calm} />
    </svg>
  );
}

/**
 * Hotspot boxes (in the 1600×900 canvas) for each place. Only ids listed for the place
 * render; StoryApp decides what each does.
 */
export const HOTSPOTS = {
  home: [
    { id: 'calendar', x: 220, y: 130, w: 130, h: 160 },
    { id: 'goal', x: 370, y: 95, w: 190, h: 360 },
    { id: 'jars', x: 470, y: 320, w: 110, h: 140 },
    { id: 'bed', x: 200, y: 470, w: 270, h: 180 },
    { id: 'hobby', x: 580, y: 450, w: 110, h: 210 },
    { id: 'akka', x: 900, y: 470, w: 130, h: 300 },
    { id: 'phone', x: 1090, y: 470, w: 60, h: 70 },
    { id: 'desk', x: 1150, y: 480, w: 90, h: 60 },
    { id: 'laptop', x: 1250, y: 430, w: 120, h: 110 },
    { id: 'cycle', x: 1110, y: 600, w: 220, h: 170 },
  ],
  hangout: [
    { id: 'notice', x: 220, y: 375, w: 180, h: 140 },
    { id: 'zoya', x: 650, y: 470, w: 140, h: 330 },
    { id: 'arjun', x: 860, y: 480, w: 140, h: 330 },
    { id: 'chai', x: 1030, y: 300, w: 320, h: 300 },
  ],
  market: [
    { id: 'banner', x: 470, y: 105, w: 380, h: 80 },
    { id: 'shop', x: 430, y: 300, w: 470, h: 350 },
    { id: 'aunty', x: 1060, y: 380, w: 160, h: 280 },
  ],
};

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The player's room, drawn in SVG. It changes only in response to milestones the engine
 * recorded (chapters, savings, badges, wellbeing), never because something was bought to
 * look rich. Savings fill the jar; goal progress fills the frame on the wall.
 */
export default function Room({ avatar, savings, goalPct, goalEmoji, wellbeing, chapterIndex, badges, goalBought, level }) {
  const reduce = useReducedMotion();
  const jarFill = Math.max(0, Math.min(1, savings / 150000)); // full jar at ₹1,500
  const happy = wellbeing >= 55;
  const has = (id) => badges.includes(id);
  const items = [];
  if (chapterIndex >= 1) items.push('a desk lamp');
  if (chapterIndex >= 4) items.push('a wall planner');
  if (has('scam_spotter')) items.push('a Scam Spotter shield poster');
  if (goalBought) items.push('your goal, reached');
  if (level >= 3) items.push('a skills certificate');
  const label = `Your room. Savings jar ${Math.round(jarFill * 100)}% full, goal ${goalPct}% funded, the plant looks ${happy ? 'healthy' : 'a bit droopy'}.` +
    (items.length ? ` Unlocked: ${items.join(', ')}.` : '');

  const t = reduce ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 16 };

  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={label} className="h-auto w-full">
      <defs>
        <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f5f0ff" />
          <stop offset="1" stopColor="#eef6f5" />
        </linearGradient>
        <clipPath id="jarClip"><rect x="236" y="96" width="34" height="40" rx="8" /></clipPath>
        <clipPath id="frameClip"><rect x="34" y="28" width="56" height="50" rx="4" /></clipPath>
      </defs>
      <rect width="320" height="140" fill="url(#wall)" />
      <rect y="140" width="320" height="40" fill="#e7ddd0" />
      <rect y="138" width="320" height="4" fill="#d6c8b6" />

      {/* window */}
      <rect x="130" y="22" width="70" height="56" rx="6" fill="#dff3ff" stroke="#cbd5e1" strokeWidth="3" />
      <line x1="165" y1="22" x2="165" y2="78" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx="186" cy="38" r="7" fill="#fde68a" />

      {/* goal frame: fills with goal progress */}
      <rect x="30" y="24" width="64" height="58" rx="6" fill="#fff" stroke="#a855f7" strokeWidth="3" />
      <g clipPath="url(#frameClip)">
        <motion.rect x="34" width="56" fill="#f3e8ff" initial={false} animate={{ y: 78 - 50 * (goalPct / 100), height: 50 * (goalPct / 100) }} transition={t} />
      </g>
      <text x="62" y="58" textAnchor="middle" fontSize="22">{goalEmoji || '🎯'}</text>
      <text x="62" y="76" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7e22ce">{goalPct}%</text>

      {/* wall planner (chapter 5+) */}
      {chapterIndex >= 4 && (
        <g>
          <rect x="216" y="26" width="40" height="44" rx="4" fill="#fff" stroke="#14b8a6" strokeWidth="2" />
          <rect x="216" y="26" width="40" height="10" rx="3" fill="#14b8a6" />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={221 + c * 11} y={41 + r * 9} width="8" height="6" rx="1" fill={r * 3 + c < 6 ? '#99f6e4' : '#e2e8f0'} />
          )))}
        </g>
      )}

      {/* scam spotter poster */}
      {has('scam_spotter') && (
        <g>
          <rect x="268" y="26" width="38" height="46" rx="4" fill="#fff7ed" stroke="#f59e0b" strokeWidth="2" />
          <text x="287" y="54" textAnchor="middle" fontSize="20">🛡️</text>
        </g>
      )}

      {/* desk */}
      <rect x="96" y="112" width="128" height="8" rx="2" fill="#a07850" />
      <rect x="104" y="120" width="6" height="22" fill="#8b6640" />
      <rect x="210" y="120" width="6" height="22" fill="#8b6640" />
      {/* laptop / books */}
      <rect x="140" y="98" width="36" height="14" rx="2" fill="#334155" />
      <rect x="112" y="104" width="20" height="8" rx="1" fill="#f87171" />
      <rect x="114" y="98" width="18" height="6" rx="1" fill="#60a5fa" />

      {/* lamp (chapter 2+) */}
      {chapterIndex >= 1 && (
        <g>
          <rect x="200" y="106" width="12" height="6" rx="2" fill="#475569" />
          <rect x="204" y="86" width="3" height="20" fill="#475569" />
          <path d="M196 86 L216 86 L210 76 L202 76 Z" fill="#fbbf24" />
        </g>
      )}

      {/* certificate (level 3+) */}
      {level >= 3 && (
        <g>
          <rect x="96" y="40" width="26" height="20" rx="2" fill="#fffbeb" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="109" cy="52" r="4" fill="#f59e0b" />
        </g>
      )}

      {/* savings jar */}
      <rect x="236" y="96" width="34" height="40" rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
      <g clipPath="url(#jarClip)">
        <motion.rect x="236" width="34" fill="#5eead4" initial={false} animate={{ y: 136 - 40 * jarFill, height: 40 * jarFill }} transition={t} />
      </g>
      <rect x="240" y="90" width="26" height="7" rx="2" fill="#94a3b8" />
      <text x="253" y="122" textAnchor="middle" fontSize="12">₹</text>

      {/* plant reflects wellbeing */}
      <rect x="282" y="122" width="18" height="16" rx="3" fill="#c2410c" />
      {happy ? (
        <g fill="#16a34a">
          <ellipse cx="285" cy="112" rx="6" ry="10" transform="rotate(-25 285 112)" />
          <ellipse cx="297" cy="112" rx="6" ry="10" transform="rotate(25 297 112)" />
          <ellipse cx="291" cy="106" rx="5" ry="11" />
        </g>
      ) : (
        <g fill="#84cc16">
          <ellipse cx="284" cy="120" rx="5" ry="8" transform="rotate(-60 284 120)" />
          <ellipse cx="298" cy="120" rx="5" ry="8" transform="rotate(60 298 120)" />
        </g>
      )}

      {/* character */}
      <circle cx="60" cy="126" r="26" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <text x="60" y="136" textAnchor="middle" fontSize="28">{avatar}</text>
      {goalBought && <text x="88" y="112" fontSize="18">{goalEmoji}</text>}
    </svg>
  );
}

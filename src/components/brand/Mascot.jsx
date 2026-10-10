import React from 'react';

/**
 * Paisa, the PaisaPath mascot: a rupee coin with a sprout (money that grows).
 * Purely decorative unless a `label` is given, so screen readers skip it by default.
 *
 * mood: 'happy' | 'wow' | 'think' | 'cheer'
 */
export default function Mascot({ size = 64, mood = 'happy', talking = false, idle = true, label, className = '' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${idle ? 'motion-safe:animate-bob' : ''} ${className}`}
      {...a11y}
    >
      {/* Sprout */}
      <path d="M59 26c-5-12-18-16-27-12 3 10 13 16 26 15" fill="#12AD86" />
      <path d="M61 26c5-12 18-16 27-12-3 10-13 16-26 15" fill="#2EC79E" />
      <path d="M60 33v-9" stroke="#0B6F59" strokeWidth="4" strokeLinecap="round" />
      {/* Coin */}
      <circle cx="60" cy="72" r="40" fill="#F98A07" />
      <circle cx="60" cy="69" r="40" fill="#FFA620" />
      <circle cx="60" cy="69" r="31" fill="#FFBC4A" />
      <path d="M36 52a31 31 0 0 1 22-13" stroke="#FFF8EB" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Cheeks */}
      <circle cx="39" cy="78" r="5" fill="#FF8A6B" opacity="0.55" />
      <circle cx="81" cy="78" r="5" fill="#FF8A6B" opacity="0.55" />
      <Face mood={mood} talking={talking} />
      {mood === 'cheer' && (
        <g fill="#6D55FA">
          <path d="M14 40l4 8-8-3z" />
          <path d="M104 34l-3 9 8-4z" />
          <circle cx="20" cy="22" r="3" fill="#2EC79E" />
          <circle cx="100" cy="18" r="3" fill="#FFA620" />
        </g>
      )}
    </svg>
  );
}

function Face({ mood, talking }) {
  const eye = '#0E1230';
  if (mood === 'think') {
    return (
      <g>
        <circle cx="49" cy="66" r="4.5" fill={eye} />
        <circle cx="71" cy="64" r="4.5" fill={eye} />
        <path d="M51 82h18" stroke={eye} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (mood === 'wow') {
    return (
      <g>
        <circle cx="48" cy="65" r="5.5" fill={eye} />
        <circle cx="72" cy="65" r="5.5" fill={eye} />
        <ellipse cx="60" cy="83" rx="6" ry="7" fill={eye} />
      </g>
    );
  }
  const closed = mood === 'cheer';
  return (
    <g>
      {closed ? (
        <>
          <path d="M43 66q5-6 10 0" stroke={eye} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M67 66q5-6 10 0" stroke={eye} strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="48" cy="66" r="5" fill={eye} />
          <circle cx="72" cy="66" r="5" fill={eye} />
          <circle cx="49.5" cy="64.5" r="1.6" fill="#fff" />
          <circle cx="73.5" cy="64.5" r="1.6" fill="#fff" />
        </>
      )}
      {talking ? (
        <ellipse cx="60" cy="82" rx="8" ry="5" fill={eye} className="motion-safe:animate-pulse" />
      ) : (
        <path d="M48 79q12 11 24 0" stroke={eye} strokeWidth="4" strokeLinecap="round" fill="none" />
      )}
    </g>
  );
}

/** Wordmark used in the header: mascot plus name. */
export function Logo({ name = 'PaisaPath' }) {
  return (
    <span className="flex items-center gap-2">
      <Mascot size={36} idle={false} />
      <span className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{name}</span>
    </span>
  );
}

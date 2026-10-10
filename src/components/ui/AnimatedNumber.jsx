import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const rupees = (n) => Math.round(n).toLocaleString('en-IN');

/**
 * Counts toward a new value so a change in money is visible as cause and effect. With reduced
 * motion it jumps straight to the value. The final text always equals the real value.
 */
export default function AnimatedNumber({ value, format = rupees, duration = 0.45 }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    if (reduce || shownRef.current === value) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }
    const controls = animate(shownRef.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        shownRef.current = v;
        setShown(v);
      },
      onComplete: () => {
        shownRef.current = value;
        setShown(value);
      },
    });
    return () => controls.stop();
  }, [value, reduce, duration]);

  return <span>{format(shown)}</span>;
}

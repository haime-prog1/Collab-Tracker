const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Confetti + haptics for a deal going live. Confetti is lazy-loaded so it never weighs on first paint. */
export async function celebrate() {
  try {
    navigator.vibrate?.([30, 40, 60]);
  } catch {
    /* unsupported */
  }
  if (reducedMotion()) return;
  const { default: confetti } = await import('canvas-confetti');
  const colors = ['#a855f7', '#8b5cf6', '#10b981', '#34d399', '#f0abfc'];
  const base = { colors, disableForReducedMotion: true, zIndex: 9999, ticks: 220 };
  confetti({ ...base, particleCount: 90, spread: 70, origin: { y: 0.7 } });
  setTimeout(() => confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } }), 180);
  setTimeout(() => confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } }), 180);
}

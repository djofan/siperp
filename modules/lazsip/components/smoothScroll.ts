const NAVBAR_OFFSET = 96; // sinkron dengan scroll-margin-top di app/globals.css (.lazsip-public)

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothScrollToId(id: string, duration = 650) {
  const el = document.getElementById(id);
  if (!el) return false;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startY = window.scrollY;
  const targetY = el.getBoundingClientRect().top + startY - NAVBAR_OFFSET;

  if (prefersReducedMotion) {
    window.scrollTo(0, targetY);
    return true;
  }

  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  return true;
}

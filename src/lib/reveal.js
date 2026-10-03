// Fade-up-once as things scroll into view. Only runs when <html> has the `motion` class
// (i.e. the visitor hasn't asked for reduced motion), so content is never hidden otherwise.
const TARGETS = [
  '.section-title', '.section-lead', '.store-card', '.restaurants__browse', '.step',
  '.info-card', '.benefits li', '.order-form', '.demo',
].join(', ');

export function setupReveal(root = document) {
  if (!document.documentElement.classList.contains('motion') || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.12 });

  root.querySelectorAll(TARGETS).forEach((el) => {
    if (el.closest('.hero')) return; // the hero has its own entrance
    const siblings = [...el.parentElement.children].filter((c) => c.matches(TARGETS));
    el.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(el), 5) * 60}ms`);
    el.classList.add('reveal');
    observer.observe(el);
  });
}

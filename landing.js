// Карусель «Какое чудо создадим?» на главной
(() => {
  const track = document.querySelector('.product-track');
  if (!track) return;
  const slides = [...document.querySelectorAll('.product-slide')];
  const tabs = [...document.querySelectorAll('.product-tab')];
  const prev = document.querySelector('[data-direction="-1"]');
  const next = document.querySelector('[data-direction="1"]');
  let active = 0;
  const update = (i) => {
    active = i;
    tabs.forEach((t, k) => { t.classList.toggle('active', k === i); t.setAttribute('aria-pressed', String(k === i)); });
    prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    document.querySelector('.slide-count').textContent = `${i + 1} / ${slides.length}`;
  };
  const show = (i) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  tabs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.slide))));
  prev.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));
  track.addEventListener('scroll', () => {
    const d = slides[1].offsetLeft - slides[0].offsetLeft;
    update(Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / d))));
  }, { passive: true });
})();

const storiesSection = document.getElementById('stories');
const storyArtwork = storiesSection.querySelector('.story-art');
const mobileStories = matchMedia('(max-width: 740px)');

let artworkVisible = false;
function updateStoryFlight() {
  storiesSection.toggleAttribute('data-story-visible', artworkVisible && !document.hidden);
}

const storyVisibility = new IntersectionObserver(([entry]) => {
  artworkVisible = entry.isIntersecting;
  updateStoryFlight();
});
storyVisibility.observe(storyArtwork);
document.addEventListener('visibilitychange', updateStoryFlight);

const reduceStoryMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Start once on older Safari. Observe the fixed section, so the animation
// cannot change the threshold that starts it.
if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry 0% entry 38%)')) {
  storiesSection.dataset.storyEnter = 'waiting';
  const storyEntry = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    storiesSection.dataset.storyEnter = 'playing';
    storyEntry.disconnect();
  }, { rootMargin: '0px 0px -120px 0px' });
  storyEntry.observe(storiesSection);
}

let storyScroll;

function scrollToStories(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || reduceStoryMotion.matches) return;

  event.preventDefault();
  storyScroll?.abort();
  const hash = event.currentTarget.hash;
  if (location.hash !== hash) history.pushState(null, '', hash);
  if (mobileStories.matches) {
    storiesSection.focus({ preventScroll: true });
    storiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const controller = new AbortController();
  storyScroll = controller;
  const { signal } = controller;
  const cancel = () => controller.abort();
  for (const type of ['wheel', 'pointerdown', 'keydown', 'popstate']) {
    window.addEventListener(type, cancel, { passive: true, signal });
  }
  reduceStoryMotion.addEventListener('change', cancel, { signal });

  const start = window.scrollY;
  const distance = storiesSection.getBoundingClientRect().top;
  const duration = Math.abs(distance) < 1 ? 0 : 1450;
  const startTime = performance.now();

  function scrollFrame(now) {
    if (signal.aborted) return;
    const progress = duration ? Math.min(1, (now - startTime) / duration) : 1;
    const eased = progress * progress * (3 - 2 * progress);
    if (progress < 1) {
      window.scrollTo(0, start + distance * eased);
      requestAnimationFrame(scrollFrame);
    } else {
      window.scrollBy(0, storiesSection.getBoundingClientRect().top);
      storiesSection.focus({ preventScroll: true });
      cancel();
    }
  }

  requestAnimationFrame(scrollFrame);
}

document.querySelectorAll('a[href="#stories"]').forEach((link) => {
  link.addEventListener('click', scrollToStories);
});

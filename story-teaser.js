const storiesSection = document.getElementById('stories');
const storyArtwork = storiesSection.querySelector('.story-art');
const expandedTeaser = matchMedia('(max-width: 740px) and (prefers-reduced-motion: no-preference)');

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

let teaserFrame = 0;
let lastProgress;
function positionStoryTeaser() {
  teaserFrame = 0;
  const sectionTop = storiesSection.getBoundingClientRect().top;
  const viewportHeight = window.innerHeight;
  const start = Math.min(sectionTop + window.scrollY, viewportHeight);
  const distance = Math.min(300, viewportHeight * .43);
  const progress = Math.min(1, Math.max(0, (start - sectionTop) / distance));
  if (progress === lastProgress) return;
  lastProgress = progress;

  // The heading clears the book's path before the book grows into the centre.
  storiesSection.style.setProperty('--story-title-up', (1 - progress) ** 2.4);
  storiesSection.style.setProperty('--story-title-right', (1 - progress) ** 1.5);
  storiesSection.style.setProperty('--story-art-offset', 1 - progress ** 1.45);
}

function queueTeaserPosition() {
  if (!teaserFrame) teaserFrame = requestAnimationFrame(positionStoryTeaser);
}

function syncStoryTeaser() {
  storiesSection.toggleAttribute('data-story-expansion', expandedTeaser.matches);
  if (expandedTeaser.matches) {
    lastProgress = undefined;
    positionStoryTeaser();
    window.addEventListener('scroll', queueTeaserPosition, { passive: true });
    window.addEventListener('resize', queueTeaserPosition);
  } else {
    window.removeEventListener('scroll', queueTeaserPosition);
    window.removeEventListener('resize', queueTeaserPosition);
    cancelAnimationFrame(teaserFrame);
    teaserFrame = 0;
  }
}

expandedTeaser.addEventListener('change', syncStoryTeaser);
syncStoryTeaser();

const reduceStoryMotion = matchMedia('(prefers-reduced-motion: reduce)');
let storyScroll;

function scrollToStories(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || reduceStoryMotion.matches) return;

  event.preventDefault();
  storyScroll?.abort();
  const controller = new AbortController();
  storyScroll = controller;
  const { signal } = controller;
  const cancel = () => controller.abort();
  for (const type of ['wheel', 'pointerdown', 'keydown', 'popstate']) {
    window.addEventListener(type, cancel, { passive: true, signal });
  }
  reduceStoryMotion.addEventListener('change', cancel, { signal });

  const hash = event.currentTarget.hash;
  if (location.hash !== hash) history.pushState(null, '', hash);
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

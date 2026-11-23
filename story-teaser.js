const storiesSection = document.getElementById('stories');
const storyArtwork = storiesSection.querySelector('.story-art');
const mobileStories = matchMedia('(max-width: 740px)');
const expandedTeaser = matchMedia('(min-width: 360px) and (max-width: 740px) and (prefers-reduced-motion: no-preference)');

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

let storiesNearViewport = false;
let storyRevealed = false;

function updateStoryReveal() {
  // Reset near the top so a small change in scroll direction can't restart the reveal.
  const revealed = storyRevealed ? window.scrollY > 24 : storiesNearViewport && window.scrollY >= 72;
  if (revealed === storyRevealed) return;
  storyRevealed = revealed;
  storiesSection.removeAttribute('data-story-settled');
  storiesSection.toggleAttribute('data-story-revealed', revealed);
}

// Observe the section itself so the zoom, page layout changes and collapsing
// browser controls cannot leave a stale document scroll threshold.
const storyRevealVisibility = new IntersectionObserver(([entry]) => {
  storiesNearViewport = entry.isIntersecting;
  updateStoryReveal();
}, { rootMargin: '0px 0px -48px 0px' });

storyArtwork.addEventListener('transitionend', event => {
  if (event.target === storyArtwork && event.propertyName === 'transform' && storyRevealed) {
    storiesSection.setAttribute('data-story-settled', '');
  }
});

function syncStoryTeaser() {
  storiesSection.toggleAttribute('data-story-expansion', expandedTeaser.matches);
  storiesNearViewport = false;
  storyRevealed = false;
  if (expandedTeaser.matches) {
    storyRevealVisibility.observe(storiesSection);
    window.addEventListener('scroll', updateStoryReveal, { passive: true });
  } else {
    storyRevealVisibility.disconnect();
    window.removeEventListener('scroll', updateStoryReveal);
  }
  storiesSection.toggleAttribute('data-story-revealed', storyRevealed);
  storiesSection.toggleAttribute('data-story-settled', storyRevealed);
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

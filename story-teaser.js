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

let viewportWidth;
let viewportHeight;
let revealAt;
let storyRevealed = false;

function updateStoryReveal() {
  // Reset near the top so a small change in scroll direction can't restart the reveal.
  const revealed = window.scrollY >= (storyRevealed ? 24 : revealAt);
  if (revealed === storyRevealed) return;
  storyRevealed = revealed;
  storiesSection.setAttribute('data-story-transition', '');
  storiesSection.removeAttribute('data-story-settled');
  storiesSection.toggleAttribute('data-story-revealed', revealed);
}

function measureStoryTeaser() {
  // Collapsing mobile browser controls must not move the animation's scroll range.
  if (viewportWidth !== window.innerWidth) {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
  }
  const sectionTop = storiesSection.getBoundingClientRect().top + window.scrollY;
  revealAt = Math.max(72, sectionTop - viewportHeight + 108);
}

const teaserLayout = new ResizeObserver(measureStoryTeaser);
storyArtwork.addEventListener('transitionend', event => {
  if (event.target === storyArtwork && event.propertyName === 'transform' && storyRevealed) {
    storiesSection.setAttribute('data-story-settled', '');
  }
});

function syncStoryTeaser() {
  storiesSection.toggleAttribute('data-story-expansion', expandedTeaser.matches);
  storiesSection.removeAttribute('data-story-transition');
  storyRevealed = false;
  if (expandedTeaser.matches) {
    viewportWidth = undefined;
    measureStoryTeaser();
    storyRevealed = window.scrollY >= revealAt;
    teaserLayout.observe(document.querySelector('.home-header-band'));
    teaserLayout.observe(document.querySelector('.ht-hero'));
    window.addEventListener('scroll', updateStoryReveal, { passive: true });
    window.addEventListener('resize', measureStoryTeaser);
  } else {
    teaserLayout.disconnect();
    window.removeEventListener('scroll', updateStoryReveal);
    window.removeEventListener('resize', measureStoryTeaser);
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

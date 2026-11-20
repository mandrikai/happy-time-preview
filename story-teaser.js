const storiesSection = document.getElementById('stories');
const storyArtwork = storiesSection.querySelector('.story-art');
const storyHeading = storiesSection.querySelector('.story-title');
const expandedTeaser = matchMedia('(max-width: 740px) and (prefers-reduced-motion: no-preference)');
const nativeStoryScroll = CSS.supports('animation-timeline: scroll(root block)') &&
  CSS.supports('animation-range: 10px 20px');

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
let teaserAnimations = [];
let viewportWidth;
let viewportHeight;
let scrollStart;
let scrollDistance;
let lastProgress;
function positionStoryTeaser() {
  teaserFrame = 0;
  if (!teaserAnimations.length) {
    const artwork = storyArtwork.getAnimations().find(animation => animation.animationName === 'story-art-enter');
    const heading = storyHeading.getAnimations().find(animation => animation.animationName === 'story-heading-enter');
    if (!artwork || !heading) return;
    teaserAnimations = [artwork, heading]
      .map(animation => ({ animation, duration: animation.effect.getTiming().duration }));
  }
  const progress = Math.min(1, Math.max(0, (window.scrollY - scrollStart) / scrollDistance));
  if (progress === lastProgress) return;
  lastProgress = progress;

  for (const { animation, duration } of teaserAnimations) {
    animation.currentTime = progress * duration;
  }
}

function measureStoryTeaser() {
  // Collapsing mobile browser controls must not move the animation's scroll range.
  if (viewportWidth !== window.innerWidth) {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
  }
  const sectionTop = storiesSection.getBoundingClientRect().top + window.scrollY;
  const start = Math.max(0, sectionTop - viewportHeight);
  const distance = Math.max(1, Math.min(300, viewportHeight * .43));
  if (start === scrollStart && distance === scrollDistance) return;
  scrollStart = start;
  scrollDistance = distance;

  if (nativeStoryScroll) {
    storiesSection.style.setProperty('--story-scroll-start', `${scrollStart}px`);
    storiesSection.style.setProperty('--story-scroll-end', `${scrollStart + scrollDistance}px`);
  } else {
    queueTeaserPosition();
  }
}

function queueTeaserPosition() {
  if (!teaserFrame) teaserFrame = requestAnimationFrame(positionStoryTeaser);
}

const teaserLayout = new ResizeObserver(measureStoryTeaser);
function syncStoryTeaser() {
  storiesSection.toggleAttribute('data-story-expansion', expandedTeaser.matches);
  storiesSection.toggleAttribute('data-story-scroll-timeline', expandedTeaser.matches && nativeStoryScroll);
  if (expandedTeaser.matches) {
    viewportWidth = undefined;
    scrollStart = undefined;
    lastProgress = undefined;
    if (!nativeStoryScroll) {
      window.addEventListener('scroll', queueTeaserPosition, { passive: true });
    }
    measureStoryTeaser();
    teaserLayout.observe(document.querySelector('.home-header-band'));
    teaserLayout.observe(document.querySelector('.ht-hero'));
    window.addEventListener('resize', measureStoryTeaser);
  } else {
    teaserLayout.disconnect();
    teaserAnimations = [];
    window.removeEventListener('scroll', queueTeaserPosition);
    window.removeEventListener('resize', measureStoryTeaser);
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

(() => {
  const MODES = {
    sleeping: {
      before: ['santa-examples/sleeping-original.jpg', 637, 'Спящая девочка до обработки'],
      after: ['santa-examples/sleeping-result.jpg', 564, 'Дед Мороз рядом со спящей девочкой'],
      note: 'Сфотографируйте спящего ребёнка, так внешность сохранится на 100%',
    },
    ordinary: {
      before: ['santa-examples/ordinary-original.jpg', 566, 'Мальчик с джойстиком до обработки'],
      after: ['santa-examples/ordinary-result.jpg', 564, 'Дед Мороз рядом со спящим мальчиком'],
      note: 'Можно загрузить обычный портрет, но черты лица могут немного отличаться',
    },
  };

  const toggle = document.querySelector('.pick-toggle');
  const photos = document.querySelector('.pick-photos');
  const before = photos.querySelector('.pick-before');
  const after = photos.querySelector('.pick-after');
  const afterTag = photos.querySelector('.pick-tag-after');
  const reveal = photos.querySelector('.pick-reveal');
  const handle = photos.querySelector('.pick-handle');
  const knob = photos.querySelector('.pick-knob-position');
  const range = photos.querySelector('.pick-range');
  const note = document.querySelector('.pick-note');
  const ctas = document.querySelectorAll('.pick-cta');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'sleeping';
  const REST = 30; // leave most of the frame to the result, where Santa is
  const MIN = 0, MAX = 100;
  const beforeLabelThreshold = 22;
  const afterLabelThreshold = 78;
  const parts = [
    [reveal, value => `translateX(${value}%)`],
    [after, value => `translateX(${-value}%)`],
    [handle, value => `translateX(${value}%)`],
    [knob, value => `translateX(clamp(26px, ${value}%, calc(100% - 26px)))`],
  ];
  let introAllowed = !reduce;
  let intro = [];

  Object.values(MODES).forEach(m => [m.before[0], m.after[0]].forEach(src => { new Image().src = src; }));

  const clamp = value => Math.max(MIN, Math.min(MAX, value));
  const setPos = value => {
    for (const [part, transform] of parts) part.style.transform = transform(value);
    const edge = value < beforeLabelThreshold ? 'left' : value > afterLabelThreshold ? 'right' : '';
    if (photos.dataset.edge !== edge) photos.dataset.edge = edge;
  };
  const stopIntro = () => {
    introAllowed = false;
    for (const animation of intro) animation.cancel();
    intro = [];
  };

  // Browsers restore form values on reload; always start from our own position.
  addEventListener('pageshow', () => {
    range.value = REST;
    setPos(REST);
  });

  // Keyboard / screen readers use the (visually hidden) range input.
  range.addEventListener('input', () => {
    stopIntro();
    setPos(range.valueAsNumber);
  });

  // Pointer: only a deliberate horizontal drag moves the handle.
  // A tap or a vertical swipe does nothing, so scrolling never jumps the slider.
  let drag = null;
  let frame = 0;
  const paintDrag = () => {
    frame = 0;
    const value = clamp((drag.nextX - drag.left) / drag.width * MAX);
    setPos(value);
    range.value = Math.round(value);
  };
  photos.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag) return;
    const { left, width } = range.getBoundingClientRect();
    if (width === 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left, width, on: false };
    photos.setPointerCapture(e.pointerId);
  });
  photos.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > 10) drag = null; // it's a scroll, let it go
        return;
      }
      drag.on = true;
      stopIntro();
      photos.classList.add('is-dragging');
    }
    e.preventDefault();
    drag.nextX = e.clientX;
    if (!frame) frame = requestAnimationFrame(paintDrag);
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (frame) {
      cancelAnimationFrame(frame);
      paintDrag();
    }
    photos.classList.remove('is-dragging');
    drag = null;
  };
  photos.addEventListener('pointerup', end);
  photos.addEventListener('pointercancel', end);
  photos.addEventListener('lostpointercapture', e => {
    if (e.target === photos) end(e);
  });

  const apply = next => {
    const m = MODES[next];
    before.src = m.before[0]; before.width = m.before[1]; before.alt = m.before[2];
    after.src = m.after[0]; after.width = m.after[1]; after.alt = m.after[2];
    note.textContent = m.note;
    for (const cta of ctas) cta.href = 'santa-upload.html?mode=' + next;
  };

  let swapTimer;
  const choose = next => {
    if (next === mode) return;
    mode = next;
    toggle.dataset.mode = next;
    toggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === next)));
    if (reduce) { apply(next); return; }
    photos.classList.add('is-swapping');
    note.classList.add('is-swapping');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      apply(next);
      const done = () => {
        if (mode !== next) return;
        photos.classList.remove('is-swapping');
        note.classList.remove('is-swapping');
      };
      after.decode ? after.decode().then(done, done) : done();
    }, 180);
  };

  toggle.addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]');
    if (b) choose(b.dataset.mode);
  });
  toggle.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const next = mode === 'sleeping' ? 'ordinary' : 'sleeping';
    choose(next);
    toggle.querySelector(`[data-mode="${next}"]`).focus();
    e.preventDefault();
  });

  // One authored moment: Santa slides into the frame once the result has loaded.
  if (introAllowed && reveal.animate) {
    const ready = () => {
      if (!introAllowed) return;
      const start = 96;
      const timing = { delay: 300, duration: 1250, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'backwards' };
      intro = parts.map(([part, transform]) => part.animate(
        [{ transform: transform(start) }, { transform: transform(REST) }],
        timing
      ));
      const showAfter = (start - afterLabelThreshold) / (start - REST);
      intro.push(afterTag.animate([
        { opacity: 0 },
        { opacity: 0, offset: showAfter },
        { opacity: 1, offset: showAfter },
        { opacity: 1 },
      ], timing));
    };
    after.complete ? ready() : after.addEventListener('load', ready, { once: true });
  }
})();

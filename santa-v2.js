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
  const range = photos.querySelector('.pick-range');
  const note = document.querySelector('.pick-note');
  const cta = document.querySelector('.pick-cta');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'sleeping';
  const REST = 30; // leave most of the frame to the result, where Santa is
  const MIN = 0, MAX = 100;

  Object.values(MODES).forEach(m => [m.before[0], m.after[0]].forEach(src => { new Image().src = src; }));

  const setPos = value => {
    const n = Number(value);
    const v = Math.max(MIN, Math.min(MAX, Number.isFinite(n) ? n : REST));
    photos.style.setProperty('--pos', v + '%');
    photos.dataset.edge = v < 22 ? 'left' : v > 78 ? 'right' : '';
  };

  // Browsers restore form values on reload; always start from our own position.
  addEventListener('pageshow', () => { range.value = REST; });

  // Keyboard / screen readers use the (visually hidden) range input.
  range.addEventListener('input', () => {
    photos.classList.remove('is-intro');
    setPos(range.value);
  });

  // Pointer: only a deliberate horizontal drag moves the handle.
  // A tap or a vertical swipe does nothing, so scrolling never jumps the slider.
  let drag = null;
  const posFromX = x => {
    const r = range.getBoundingClientRect();
    return ((x - r.left) / r.width) * 100;
  };
  photos.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, mouse: e.pointerType === 'mouse' };
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
      photos.setPointerCapture(e.pointerId);
      photos.classList.remove('is-intro');
      photos.classList.add('is-dragging');
    }
    e.preventDefault();
    const v = posFromX(e.clientX);
    setPos(v);
    range.value = Math.round(Math.max(MIN, Math.min(MAX, v)));
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    photos.classList.remove('is-dragging');
    drag = null;
  };
  photos.addEventListener('pointerup', end);
  photos.addEventListener('pointercancel', end);

  const apply = next => {
    const m = MODES[next];
    before.src = m.before[0]; before.width = m.before[1]; before.alt = m.before[2];
    after.src = m.after[0]; after.width = m.after[1]; after.alt = m.after[2];
    note.textContent = m.note;
    cta.href = 'santa-upload.html?mode=' + next;
  };

  const choose = next => {
    if (next === mode) return;
    mode = next;
    toggle.dataset.mode = next;
    toggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === next)));
    if (reduce) { apply(next); return; }
    photos.classList.add('is-swapping');
    note.classList.add('is-swapping');
    setTimeout(() => {
      apply(next);
      const done = () => { photos.classList.remove('is-swapping'); note.classList.remove('is-swapping'); };
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
  if (!reduce) {
    setPos(96);
    const start = () => requestAnimationFrame(() => {
      photos.classList.add('is-intro');
      setPos(REST);
      range.value = REST;
    });
    const ready = () => setTimeout(start, 350);
    after.complete ? ready() : after.addEventListener('load', ready, { once: true });
  } else {
    setPos(REST);
    range.value = REST;
  }
})();

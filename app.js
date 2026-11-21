// Пошаговая анкета. Каждый шаг — объект { title, hint, render(), valid(), skip? }.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const A = {}; // ответы
const MIN_AGE = 1;
const MAX_AGE = 18;

const stylesForTale = () => {
  const own = config.tales.find((t) => t.id === A.taleId)?.styles;
  return config.styles.filter((s) => (own ? own.includes(s.id) : !s.taleOnly));
};
const talesForAge = () => config.tales.filter((t) => A.age >= (t.minAge ?? 1) && A.age <= (t.maxAge ?? 18));

function ageWord(n) {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? 'год' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'года' : 'лет';
}
let config;
let i = 0;


const him = () => (A.gender === 'f' ? 'её' : 'его');
const kid = () => (A.gender === 'f' ? 'девочку' : A.gender === 'm' ? 'мальчика' : 'ребёнка');

function cards(key, items, cls = '') {
  return `<div class="cards ${cls}">${items
    .map((it) => `
      <button type="button" class="card ${A[key] === it.id ? 'on' : ''}" data-key="${key}" data-val="${it.id}" aria-pressed="${A[key] === it.id}">
        ${it.color ? `<span class="swatch ${key === 'taleId' ? 'tale-swatch' : ''}" aria-hidden="true" style="background:${it.color}">${key === 'style' ? `<img src="styles/${it.id}.jpg" alt="" onerror="this.remove()">` : ''}</span>` : ''}
        <b>${esc(it.title)}</b>${it.blurb ? `<small>${esc(it.blurb)}</small>` : ''}
      </button>`)
    .join('')}</div>`;
}

function chips(key, list) {
  return `<div class="chips">${list.map((c) => `<button type="button" class="chip" data-chip="${key}" data-val="${c}">${c}</button>`).join('')}</div>`;
}

const STEPS = [
  {
    title: () => 'Сколько лет главному герою?',
    hint: 'Так мы нарисуем героя нужного возраста',
    render: () => {
      A.age = A.age || 3;
      const pos = (n) => ((n - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
      const ticks = [1, 3, 6, 9, 12, 15, 18].map((n) => `<span style="left:${pos(n)}%">${n}</span>`).join('');
      return `<div class="age">
        <div class="age-num"><b id="ageN">${A.age}</b><span id="ageW">${ageWord(A.age)}</span></div>
        <input type="range" id="f-age" aria-label="Возраст ребёнка" min="${MIN_AGE}" max="${MAX_AGE}" step="1" value="${A.age}">
        <div class="age-ticks">${ticks}</div>
      </div>`;
    },
    mount: () => {
      const r = $('f-age');
      const paint = () => {
        A.age = Number(r.value);
        $('ageN').textContent = A.age;
        $('ageW').textContent = ageWord(A.age);
        r.style.setProperty('--p', `${((A.age - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100}%`);
        r.setAttribute('aria-valuetext', `${A.age} ${ageWord(A.age)}`);
      };
      r.addEventListener('input', paint);
      paint();
    },
    valid: () => !!A.age || 'Укажите возраст',
  },
  {
    title: () => 'Мальчик или девочка?',
    render: () => cards('gender', [{ id: 'm', title: 'Мальчик' }, { id: 'f', title: 'Девочка' }], 'two'),
    valid: () => !!A.gender || 'Выберите вариант',
    auto: true,
  },
  {
    title: () => `Как зовут ${kid()}?`,
    hint: 'Можно ласково, как вы зовёте дома. Имя будет на каждой странице',
    render: () => `<input type="text" id="f-name" maxlength="30" aria-label="Имя ребёнка" placeholder="Например, Соня" value="${esc(A.name || '')}" autocomplete="off">`,
    read: () => (A.name = $('f-name').value.trim()),
    valid: () => !!A.name || 'Напишите имя',
  },
  {
    title: () => 'Какую сказку читаем?',
    hint: () => `Сказки для возраста ${A.age} ${ageWord(A.age)}`,
    render: () => {
      const list = talesForAge();
      if (A.taleId && !list.some((t) => t.id === A.taleId)) delete A.taleId;
      if (!list.length) return `<div class="summary"><p><b>Для этого возраста сказки скоро появятся</b></p><p>Сейчас есть сказки для ${config.tales.map((t) => t.ages).join(', ')}. Можно вернуться и поменять возраст.</p></div>`;
      return cards('taleId', list.map((t) => ({ ...t, title: t.title.replaceAll('{name}', A.name || 'Малыш'), blurb: `${t.blurb.replaceAll('{name}', A.name || 'малыш')} ${t.ages}` })), 'one');
    },
    valid: () => (talesForAge().length ? !!A.taleId || 'Выберите сказку' : 'Для этого возраста сказок пока нет'),
    auto: true,
  },
  {
    title: () => 'В каком стиле рисовать?',
    hint: 'Стиль задаст настроение всей книжки',
    render: () => {
      if (A.style && !stylesForTale().some((s) => s.id === A.style)) delete A.style;
      return cards('style', stylesForTale(), 'styles');
    },
    valid: () => !!A.style || 'Выберите стиль',
    // у сказки один свой стиль — шаг не показываем, стиль ставим сам
    skip: () => { const l = stylesForTale(); if (l.length === 1) { A.style = l[0].id; return true; } return false; },
    auto: true,
  },
  {
    title: () => `Фото ${A.gender === 'f' ? 'героини' : 'героя'}`,
    hint: 'Лицо видно целиком, светло, ребёнок один в кадре, спокойная естественная эмоция',
    render: () => `
      <div class="photo-box" id="drop">
        <div id="dropInner">${A.src ? cropHTML() : ''}</div>
        <div class="photo-btns">
          <label class="cam">Сфотографировать<input type="file" id="cam" accept="image/*" capture="environment"></label>
          <label class="gal">${A.src ? 'Выбрать другое фото' : 'Выбрать из галереи'}<input type="file" id="file" accept="image/*"></label>
        </div>
      </div>
      <ul class="tips"><li>лицо видно целиком</li><li>светло, без фильтров</li><li>ребёнок один в кадре</li></ul>`,
    mount: mountPhoto,
    valid: () => { if (A.src) A.photo = cropExport(); return !!A.photo || 'Добавьте фото'; },
  },
  {
    title: () => 'Почти готово',
    render: () => `
      <div class="summary">
        <p><b>${esc(A.name)}</b>, ${A.age} ${ageWord(A.age)}, ${A.gender === 'f' ? 'девочка' : 'мальчик'}</p>
        <p>Стиль: ${esc(config.styles.find((s) => s.id === A.style)?.title)}</p>
        <p>Сказка: ${esc(config.tales.find((t) => t.id === A.taleId)?.title.replaceAll('{name}', A.name))}</p>
      </div>
      ${config.needCode ? `<label class="field"><span>Код доступа</span><input type="text" id="f-code" value="${esc(A.code || '')}" autocomplete="off"></label>` : ''}
      <label class="consent">
        <input type="checkbox" id="f-consent" ${A.consent ? 'checked' : ''}>
        <span>Я родитель или законный представитель ребёнка и согласен(на), чтобы фото использовалось для создания иллюстраций. Исходное фото может сохраняться вместе с книгой для перерисовки страниц.</span>
      </label>`,
    read: () => {
      A.consent = $('f-consent').checked;
      if ($('f-code')) A.code = $('f-code').value.trim();
    },
    valid: () => !!A.consent || 'Нужно согласие на обработку фото',
    final: true,
  },
];

init();

async function init() {
  try {
    const response = await fetch('api/config');
    if (!response.ok) throw new Error('Не удалось загрузить настройки');
    config = await response.json();
  } catch {
    $('demo').textContent = 'Анкета пока не загрузилась. Обновите страницу и попробуйте снова.';
    $('demo').hidden = false;
    return;
  }
  if (config.mock) {
    $('demo').textContent = 'Демо-режим: вместо готовых иллюстраций будут заглушки.';
    $('demo').hidden = false;
  }
  document.querySelectorAll('.go').forEach((b) => (b.onclick = () => { $('intro').hidden = true; $('quiz').hidden = false; scrollTo(0, 0); show(); }));
  $('back').onclick = () => { if ($('next').disabled) return; read(); if (i > 0) { i--; while (i > 0 && STEPS[i].skip?.()) i--; show(); } else { $('quiz').hidden = true; $('intro').hidden = false; scrollTo(0, 0); } };
  $('next').onclick = next;
}

function read() { STEPS[i].read?.(); }

function show() {
  const s = STEPS[i];
  $('err').textContent = '';
  $('bar').style.width = `${((i + 1) / STEPS.length) * 100}%`;
  $('count').textContent = `Шаг ${i + 1} из ${STEPS.length}`;
  const hint = typeof s.hint === 'function' ? s.hint() : s.hint;
  $('step').innerHTML = `<h2 tabindex="-1">${s.title()}</h2>${hint ? `<p class="hint">${hint}</p>` : ''}${s.render()}`;
  $('next').textContent = s.final ? 'Нарисовать сказку' : 'Дальше';
  scrollTo(0, 0);
  $('next').disabled = false;
  s.mount?.();

  $('step').querySelectorAll('.card').forEach((b) =>
    b.addEventListener('click', () => {
      A[b.dataset.key] = b.dataset.val;
      $('step').querySelectorAll(`.card[data-key="${b.dataset.key}"]`).forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      if (s.auto) next();
    })
  );
  $('step').querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      const t = $(`f-${c.dataset.chip}`);
      const parts = t.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!parts.includes(c.dataset.val)) parts.push(c.dataset.val);
      t.value = parts.join(', ');
      c.classList.add('on');
    })
  );
  const input = $('step').querySelector('input[type=text]');
  $('step').querySelector('h2').focus({ preventScroll: true });
  if (input) { if (matchMedia('(pointer: fine)').matches) input.focus(); input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }; }
}

function next() {
  if ($('next').disabled) return;
  read();
  const ok = STEPS[i].valid();
  if (ok !== true && typeof ok === 'string') return ($('err').textContent = ok);
  if (STEPS[i].final) return submit();
  i++;
  while (STEPS[i].skip?.()) i++;
  show();
}

function mountPhoto() {
  if (A.src) mountCrop();
  const drop = $('drop');
  ['file', 'cam'].forEach((x) => $(x).addEventListener('change', (e) => e.target.files[0] && take(e.target.files[0])));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && take(e.dataTransfer.files[0]); });
}

async function take(file) {
  $('err').textContent = '';
  try {
    A.src = await shrink(file, 2048);
    const img = new Image();
    img.src = A.src;
    await img.decode();
    A.crop = { w: img.naturalWidth, h: img.naturalHeight, zoom: 1, x: 0.5, y: 0.42 }; // центр кадра, чуть выше середины — там обычно лицо
    A.photo = null;
    $('dropInner').innerHTML = cropHTML();
    mountCrop();
    document.querySelector('.gal').firstChild.textContent = 'Выбрать другое фото';
  } catch {
    $('err').textContent = 'Не получилось открыть это фото, попробуйте другое';
  }
}

// ——— Кадрирование: квадрат, двигаем фото пальцем, увеличиваем ползунком или щипком ———
function cropHTML() {
  return `
    <p class="crop-hint">Подвиньте фото так, чтобы лицо было в овале</p>
    <div class="crop" id="crop"><img id="cropImg" src="${A.src}" alt="" draggable="false"><div class="crop-oval"></div></div>
    <label class="crop-zoom"><span>−</span><input type="range" id="cropZoom" aria-label="Масштаб фотографии" min="1" max="4" step="0.01" value="${A.crop.zoom}"><span>+</span></label>`;
}

// размер фото в рамке: при zoom=1 короткая сторона ровно заполняет квадрат
function cropGeom(box) {
  const c = A.crop, base = box / Math.min(c.w, c.h), k = base * c.zoom;
  const W = c.w * k, H = c.h * k;
  // x, y — какая точка фото (0..1) стоит в центре рамки; не даём вылезти пустоте
  const hx = box / 2 / W, hy = box / 2 / H;
  c.x = Math.min(1 - hx, Math.max(hx, c.x));
  c.y = Math.min(1 - hy, Math.max(hy, c.y));
  return { W, H, left: box / 2 - c.x * W, top: box / 2 - c.y * H };
}

function drawCrop() {
  const el = $('crop'), img = $('cropImg');
  if (!el || !img) return;
  const g = cropGeom(el.clientWidth);
  img.style.width = g.W + 'px';
  img.style.height = g.H + 'px';
  img.style.transform = `translate(${g.left}px, ${g.top}px)`;
}

function mountCrop() {
  const el = $('crop');
  if (!el) return;
  drawCrop();
  const zoom = $('cropZoom');
  zoom.oninput = () => { A.crop.zoom = +zoom.value; drawCrop(); };
  const pts = new Map();
  let last = null;
  el.onpointerdown = (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = null; };
  el.onpointermove = (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = cropGeom(el.clientWidth);
    if (pts.size === 1) {
      A.crop.x -= (e.clientX - prev.x) / g.W;
      A.crop.y -= (e.clientY - prev.y) / g.H;
    } else {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (last) { A.crop.zoom = Math.min(4, Math.max(1, A.crop.zoom * d / last)); zoom.value = A.crop.zoom; }
      last = d;
    }
    drawCrop();
  };
  el.onpointerup = el.onpointercancel = (e) => { pts.delete(e.pointerId); last = null; };
  el.onwheel = (e) => { e.preventDefault(); A.crop.zoom = Math.min(4, Math.max(1, A.crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); zoom.value = A.crop.zoom; drawCrop(); };
  addEventListener('resize', drawCrop);
}

// Вырезаем то, что в рамке, в квадрат 1280×1280
function cropExport() {
  const img = $('cropImg');
  if (!img) return A.photo;
  const OUT = 1280, c = A.crop;
  const side = Math.min(c.w, c.h) / c.zoom; // сторона квадрата в пикселях исходника
  cropGeom(side * c.zoom); // поправит x, y в допустимые пределы
  const sx = c.x * c.w - side / 2, sy = c.y * c.h - side / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = OUT;
  cv.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, OUT, OUT);
  return cv.toDataURL('image/jpeg', 0.92);
}

async function shrink(file, max) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

async function submit() {
  $('next').disabled = true;
  $('next').textContent = 'Отправляем…';
  try {
    const res = await fetch('api/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(A) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Что-то пошло не так');
    location.href = `book.html?id=${data.id}`;
  } catch (e) {
    $('err').textContent = e.message;
    $('next').disabled = false;
    $('next').textContent = 'Нарисовать сказку';
  }
}

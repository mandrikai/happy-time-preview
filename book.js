const id = new URLSearchParams(location.search).get('id');
const $ = (x) => document.getElementById(x);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let timer;
let latestBook;
let loadVersion = 0;
const retrying = new Set();
const shown = new Map();

$('pdf').href = `api/books/${id}/pdf`;
load();

async function load() {
  clearTimeout(timer);
  const version = ++loadVersion;
  const res = await fetch(`api/books/${encodeURIComponent(id || '')}`).catch(() => null);
  if (!res) {
    if (version !== loadVersion) return;
    $('status').textContent = 'Нет связи с сайтом. Пробуем снова…';
    timer = setTimeout(load, 3000);
    return;
  }
  if (version !== loadVersion) return;
  if (!res.ok) return ($('status').textContent = 'Такой книжки нет');
  const book = await res.json();
  if (version !== loadVersion) return;
  latestBook = book;
  render(book);
  if (['writing', 'drawing'].includes(book.status)) timer = setTimeout(load, 3000);
}

function render(book) {
  document.title = book.title ? `${book.title} · ${book.name}` : 'Сказка';
  $('title').textContent = book.title || '';

  const done = book.pages.filter((p) => p.status === 'done').length;
  const total = book.pages.length || 13;
  const progress = book.status === 'writing' ? 0.04 : (0.08 + (book.sheet.status === 'done' ? 0.08 : 0) + (done / total) * 0.84);
  $('bar').parentElement.hidden = ['done', 'partial', 'failed'].includes(book.status);
  $('bar').style.width = `${book.status === 'done' ? 100 : Math.round(progress * 100)}%`;

  $('status').textContent = {
    writing: 'Пишем сюжет…',
    drawing: !['done', 'skipped'].includes(book.sheet.status) ? 'Знакомимся с героем: рисуем персонажа в выбранном стиле…' : `Рисуем страницы: готово ${done} из ${total}`,
    done: 'Книжка готова',
    partial: 'Почти готово: некоторые страницы не получились, их можно перерисовать',
    failed: `Не получилось: ${book.error || 'ошибка'}`,
  }[book.status];

  const box = $('pages');
  if (book.pages.length && !box.children.length) {
    box.innerHTML = book.pages.map((p) => `<section class="spread ${p.kind}" id="p${p.index}"></section>`).join('');
  }
  for (const p of book.pages) {
    if (p.status === 'done' && shown.get(p.index) === `${p.file}:${p.revision || 0}`) continue;
    $(`p${p.index}`).innerHTML = pageHtml(book, p);
    p.status === 'done' ? shown.set(p.index, `${p.file}:${p.revision || 0}`) : shown.delete(p.index);
  }

  $('pager').hidden = !book.pages.length;
  updatePos();
  const finished = ['done', 'partial'].includes(book.status);
  $('end').hidden = !finished;
  $('pdf').hidden = !finished;
  if (book.printRequested) $('print').innerHTML = '<h2>Печатная книга</h2><p class="hint">Заявка принята, мы свяжемся с вами.</p>';
}

function pageHtml(book, p) {
  const pic =
    p.status === 'done'
      ? `<img src="files/${book.id}/${p.file}?v=${p.revision || 0}" alt="Иллюстрация к сказке" ${p.index > 1 ? 'loading="lazy"' : ''}>`
      : p.status === 'failed'
        ? `<div class="wait failed"><div>Эта картинка не получилась<br><small>${esc(p.error)}</small><br><button onclick="redo(${p.index})">Перерисовать</button></div></div>`
        : book.status === 'failed'
          ? `<div class="wait failed">Генерация остановлена. Страница не создана.</div>`
          : `<div class="wait">рисуем…</div>`;
  if (p.kind === 'cover') {
    return `<div class="pic">${pic}${p.status === 'done' ? `<div class="cover-title">${esc(book.title)}<small>в главной роли: ${esc(book.name)}</small></div>` : ''}</div>`;
  }
  return `<div class="pic">${pic}</div><div class="page-text"><p>${esc(p.text)}</p><span class="num">${p.index}</span></div>`;
}

// листание: свайп по слайдеру плюс кнопки
const slider = $('pages');
const slides = () => [...slider.children];
function slideLeft(el) {
  return el.getBoundingClientRect().left - slider.getBoundingClientRect().left + slider.scrollLeft;
}
function current() {
  const frame = slider.getBoundingClientRect().left;
  const pages = slides();
  return pages.reduce((nearest, el, i) => {
    return Math.abs(el.getBoundingClientRect().left - frame) < Math.abs(pages[nearest].getBoundingClientRect().left - frame) ? i : nearest;
  }, 0);
}
function updatePos() {
  const pages = latestBook?.pages || [];
  if (!pages.length) return;
  const i = current();
  const total = pages.filter((page) => page.kind !== 'cover').length;
  const label = pages[i].kind === 'cover' ? 'Обложка' : `${pages[i].index} из ${total}`;
  if ($('pos').textContent !== label) $('pos').textContent = label;
  $('prev').disabled = i === 0;
  $('nextp').disabled = i === pages.length - 1;
}
function go(d, smooth = true) {
  const el = slides()[current() + d];
  if (!el) return;
  const motion = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  slider.scrollTo({ left: slideLeft(el), behavior: motion ? 'smooth' : 'instant' });
}
slider.addEventListener('scroll', () => requestAnimationFrame(updatePos), { passive: true });
slider.addEventListener('keydown', (event) => {
  if (event.target !== slider || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  go(event.key === 'ArrowRight' ? 1 : -1, false);
});
$('prev').onclick = (event) => go(-1, event.detail !== 0);
$('nextp').onclick = (event) => go(1, event.detail !== 0);

async function redo(index) {
  if (retrying.has(index) || !latestBook) return;
  const page = latestBook.pages.find((p) => p.index === index);
  if (!page || page.status === 'working') return;
  retrying.add(index);
  clearTimeout(timer);
  ++loadVersion; // Ответ старого опроса не должен вернуть ошибку поверх нового запуска.
  page.status = 'working';
  page.error = undefined;
  latestBook.status = 'drawing';
  shown.delete(index);
  render(latestBook);
  const wait = $(`p${index}`).querySelector('.wait');
  if (wait) wait.textContent = 'Перерисовываем…';
  try {
    const res = await fetch(`api/books/${id}/pages/${index}/retry`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось запустить перерисовку');
    await load();
  } catch (error) {
    page.status = 'failed';
    page.error = error.message;
    $(`p${index}`).innerHTML = pageHtml(latestBook, page);
    timer = setTimeout(load, 3000);
  } finally {
    retrying.delete(index);
  }
}

$('order').onclick = async () => {
  $('perr').textContent = '';
  const res = await fetch(`api/books/${id}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: $('phone').value }),
  });
  const data = await res.json();
  if (!res.ok) return ($('perr').textContent = data.error);
  load();
};

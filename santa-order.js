const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'ordinary' ? 'ordinary' : 'sleeping';
const product = params.get('product') === 'print' ? 'print' : 'pdf';
const isPrint = product === 'print';
const previewId = params.get('preview');
const previewStorageKey = 'happy-time-order-preview';
const orderPages = {
  preview: 'santa-order-preview.html',
  checkout: 'santa-checkout.html',
  order: 'santa-order.html',
};

function orderUrl(page, selectedMode = mode, selectedProduct, selectedPreview = previewId) {
  const query = new URLSearchParams({ mode: selectedMode });
  if (selectedProduct) query.set('product', selectedProduct);
  if (selectedPreview) query.set('preview', selectedPreview);
  return `${orderPages[page]}?${query}`;
}

let previewContent = document.querySelector('[data-preview-content]');
const previewMarkup = `
<section class="preview-heading">
  <h1 id="preview-title" tabindex="-1">Ваше фото<br class="desktop-break"> готово!</h1>
  <p class="lead">Превью выбранного фото с водяным знаком. Выберите, как хотите получить снимок.</p>
</section>
<figure class="preview-figure">
  <div class="photo-frame" data-protected-photo>
    <canvas data-preview-canvas role="img" aria-label="Превью фото с водяным знаком Happy Time"></canvas>
  </div>
</figure>
<div class="products">
  <p class="hint" data-preview-storage-message hidden>Браузер не сохранил превью для оформления. Фото можно посмотреть здесь.</p>
  <article class="product-card">
    <div><h2>Печатное фото и PDF</h2><p>Один снимок 10 × 15 см на глянцевой бумаге и чистый PDF</p></div>
    <strong class="amount">550 ₽</strong>
    <p class="pickup">Самовывоз · Пушкин, Кузьминское шоссе, 66Д, салон Happy Time</p>
    <a class="secondary" href="santa-checkout.html?product=print" data-product-link="print">Выбрать печать и PDF</a>
  </article>
  <article class="product-card">
    <div><h2>Цифровое фото</h2><p>PDF без водяного знака</p></div>
    <strong class="amount">369 ₽</strong>
    <a class="secondary" href="santa-checkout.html?product=pdf" data-product-link="pdf">Выбрать PDF</a>
  </article>
</div>
`;

async function renderOrderPreview(content, saved, drawPreviewJpeg) {
  if (!content.querySelector('[data-preview-canvas]')) content.innerHTML = previewMarkup;
  const canvas = content.querySelector('[data-preview-canvas]');
  const frame = canvas.closest('[data-protected-photo]');
  // Assign once per render so going back and creating again does not stack listeners.
  frame.oncontextmenu = event => event.preventDefault();
  await drawPreviewJpeg(canvas, saved.jpeg);
  if (frame.classList.contains('photo-frame')) {
    frame.style.aspectRatio = Math.max(2 / 3, Math.min(16 / 9, canvas.width / canvas.height));
  }
  for (const link of content.querySelectorAll('[data-product-link]')) {
    link.href = orderUrl('checkout', saved.mode, link.dataset.productLink, saved.id);
  }
}

async function restoreOrderPreview() {
  const unavailable = document.querySelector('[data-preview-unavailable]');
  unavailable.querySelector('a').href = 'santa-upload.html?' + new URLSearchParams({ mode, flow: 'preview' });
  try {
    const saved = previewId && JSON.parse(sessionStorage.getItem(previewStorageKey));
    if (!saved || saved.id !== previewId || saved.mode !== mode ||
        !saved.jpeg?.startsWith('data:image/jpeg;base64,')) {
      unavailable.hidden = false;
      return;
    }
    const { drawPreviewJpeg } = await import('./santa-preview-image.js');
    await renderOrderPreview(previewContent, saved, drawPreviewJpeg);
    previewContent.hidden = false;
  } catch {
    unavailable.querySelector('h1').textContent = 'Не удалось открыть превью';
    unavailable.hidden = false;
  }
}

if (document.querySelector('[data-preview-unavailable]')) restoreOrderPreview();

document.querySelectorAll('[data-preview-link]').forEach(link => {
  link.href = orderUrl('preview');
});
document.querySelectorAll('[data-for-print]').forEach(element => {
  element.hidden = !isPrint;
});

const photoForm = document.getElementById('photo-form');
if (photoForm) {
  const uploadLayout = photoForm.closest('.upload-layout');
  if (!previewContent) {
    previewContent = document.createElement('div');
    previewContent.className = 'preview-layout';
    previewContent.setAttribute('data-preview-content', '');
    previewContent.hidden = true;
    uploadLayout.after(previewContent);
  }
  const loading = document.getElementById('photo-loading');
  const loadingTitle = document.getElementById('photo-loading-title');
  const progressBar = document.getElementById('photo-progress');
  const progressPercent = document.getElementById('photo-progress-percent');
  const fileInput = document.getElementById('photo-file');
  const photoPicker = fileInput.closest('.photo-picker');
  const photoAction = document.getElementById('photo-picker-action');
  const image = document.getElementById('picked-photo');
  const note = document.getElementById('file-note');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const uploadThemeColor = themeColor?.content;
  const demoLoadingDuration = 6000;
  const heic = photo => /^image\/hei[cf](?:-sequence)?$/i.test(photo.type) || /\.hei[cf]$/i.test(photo.name);
  const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  let fileUrl;
  let previewTimer;
  let shownPreview;
  const uploadTitle = document.title;
  photoForm.elements.mode.value = mode;

  function setProgress(value) {
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.style.setProperty('--photo-progress', `${value}%`);
    progressPercent.textContent = `${value}%`;
  }

  function showPhotoScreen(screen) {
    const loadingActive = screen === 'loading';
    document.documentElement.toggleAttribute('data-photo-loading', loadingActive);
    uploadLayout.hidden = screen !== 'upload';
    loading.hidden = !loadingActive;
    previewContent.hidden = screen !== 'preview';
    document.title = screen === 'preview' ? 'Ваше фото готово · Happy Time' : uploadTitle;
    if (themeColor) themeColor.content = loadingActive ? '#beddf3' : uploadThemeColor;
  }

  function showCreatedPreview() {
    showPhotoScreen('preview');
    window.scrollTo(0, 0);
    previewContent.querySelector('#preview-title').focus({ preventScroll: true });
  }

  window.addEventListener('popstate', () => {
    const currentPreview = new URLSearchParams(location.search).get('preview');
    if (shownPreview && currentPreview === shownPreview) showCreatedPreview();
    else {
      stopPhotoLoading();
      showPhotoScreen('upload');
    }
  });

  function stopPhotoLoading() {
    window.clearInterval(previewTimer);
    previewTimer = undefined;
  }

  function setPhotoSelected(selected) {
    photoPicker.toggleAttribute('data-photo-selected', selected);
    photoAction.textContent = selected ? 'Изменить' : 'Выбрать фото';
  }

  fileInput.addEventListener('change', () => {
    const photo = fileInput.files[0];
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = undefined;
    image.hidden = true;
    if (!photo || !photo.size || photo.size > 7_000_000 || (!photoTypes.has(photo.type) && !heic(photo))) {
      image.removeAttribute('src');
      fileInput.value = '';
      setPhotoSelected(false);
      note.textContent = photo ? 'Выберите JPG, PNG, WebP или HEIC размером до 7 МБ.' : '';
      return;
    }
    fileUrl = URL.createObjectURL(photo);
    image.src = fileUrl;
    setPhotoSelected(true);
    note.textContent = '';
  });
  image.addEventListener('load', () => {
    image.hidden = false;
  });
  image.addEventListener('error', () => {
    const photo = fileInput.files[0];
    if (!photo || heic(photo)) return;
    image.hidden = true;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = undefined;
    fileInput.value = '';
    setPhotoSelected(false);
    note.textContent = 'Файл не открылся. Выберите другое фото.';
  });
  photoForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (previewTimer !== undefined) return;
    const photo = fileInput.files[0];
    if (!photo) {
      note.textContent = 'Выберите фото.';
      fileInput.focus();
      return;
    }
    const selectedMode = photoForm.elements.mode.value;
    showPhotoScreen('loading');
    loadingTitle.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setProgress(Math.min(98, Math.floor(elapsed / demoLoadingDuration * 100)));
    }, 100);
    previewTimer = timer;
    try {
      const { createWatermarkedJpeg, drawPreviewJpeg } = await import('./santa-preview-image.js');
      const jpeg = await createWatermarkedJpeg(photo);
      const id = crypto.randomUUID();
      const saved = { id, mode: selectedMode, jpeg };
      const remaining = demoLoadingDuration - (performance.now() - startedAt);
      if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining));
      if (previewTimer !== timer) return;
      await renderOrderPreview(previewContent, saved, drawPreviewJpeg);
      if (previewTimer !== timer) return;

      // Rendering uses this submission directly. Storage is for checkout and refresh.
      let stored = false;
      try {
        sessionStorage.setItem(previewStorageKey, JSON.stringify(saved));
        stored = true;
      } catch {}
      previewContent.querySelector('[data-preview-storage-message]').hidden = stored;
      for (const card of previewContent.querySelectorAll('.product-card')) card.hidden = !stored;
      stopPhotoLoading();
      setProgress(100);
      shownPreview = id;
      if (stored) {
        try { history.pushState(null, '', orderUrl('preview', selectedMode, undefined, id)); } catch {}
      }
      showCreatedPreview();
    } catch {
      if (previewTimer !== timer) return;
      stopPhotoLoading();
      setProgress(0);
      showPhotoScreen('upload');
      note.textContent = 'Не удалось создать превью. Попробуйте выбрать фото в JPG, PNG или WebP.';
      fileInput.focus();
    }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || previewTimer === undefined) return;
    stopPhotoLoading();
    showPhotoScreen('upload');
    setProgress(0);
  });
}

const payForm = document.getElementById('pay-form');
if (payForm) {
  const email = document.getElementById('receipt-email');
  const price = isPrint ? '550 ₽' : '369 ₽';
  if (isPrint) {
    document.querySelector('[data-product-name]').textContent = 'Печатное фото и PDF';
    document.querySelector('[data-product-desc]').textContent = 'Один отпечаток 10 × 15 см на глянцевой бумаге и чистый PDF';
  }
  document.querySelector('[data-price]').textContent = price;
  document.querySelector('[data-pay]').textContent = `Оплатить ${price}`;
  document.getElementById('fill-example').addEventListener('click', () => {
    email.value = 'demo@example.com';
  });
  payForm.addEventListener('submit', event => {
    event.preventDefault();
    location.href = orderUrl('order', mode, product);
  });
}

const download = document.getElementById('download-pdf');
if (download) download.href = `santa-examples/${mode}-example.pdf`;

const docBack = document.querySelector('[data-doc-back]');
if (docBack && document.referrer) {
  const previous = new URL(document.referrer);
  const localReferrer = new URL(previous.pathname.split('/').pop(), location.href);
  const previousPage = previous.pathname.split('/').pop();
  if (previous.origin === localReferrer.origin && previous.pathname === localReferrer.pathname &&
      ['santa-upload.html', ...Object.values(orderPages)].includes(previousPage)) {
    docBack.href = previousPage + previous.search;
  }
}

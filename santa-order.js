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

async function showOrderPreview(canvas) {
  const content = document.querySelector('[data-preview-content]');
  const unavailable = document.querySelector('[data-preview-unavailable]');
  unavailable.querySelector('a').href = `santa-upload.html?mode=${mode}`;
  try {
    const saved = previewId && JSON.parse(sessionStorage.getItem(previewStorageKey));
    if (!saved || saved.id !== previewId || saved.mode !== mode ||
        !saved.jpeg?.startsWith('data:image/jpeg;base64,')) {
      unavailable.hidden = false;
      return;
    }
    const { drawPreviewJpeg } = await import('./santa-preview-image.js');
    await drawPreviewJpeg(canvas, saved.jpeg);
    const frame = canvas.closest('[data-protected-photo]');
    frame.addEventListener('contextmenu', event => event.preventDefault());
    if (frame.classList.contains('photo-frame')) {
      frame.style.aspectRatio = Math.max(2 / 3, Math.min(16 / 9, canvas.width / canvas.height));
    }
    content.hidden = false;
  } catch {
    unavailable.hidden = false;
  }
}

const previewCanvas = document.querySelector('[data-preview-canvas]');
if (previewCanvas) showOrderPreview(previewCanvas);

document.querySelectorAll('[data-product-link]').forEach(link => {
  link.href = orderUrl('checkout', mode, link.dataset.productLink);
});
document.querySelectorAll('[data-preview-link]').forEach(link => {
  link.href = orderUrl('preview');
});
document.querySelectorAll('[data-for-print]').forEach(element => {
  element.hidden = !isPrint;
});

const photoForm = document.getElementById('photo-form');
if (photoForm) {
  const uploadLayout = photoForm.closest('.upload-layout');
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
  photoForm.elements.mode.value = mode;

  function setProgress(value) {
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.style.setProperty('--photo-progress', `${value}%`);
    progressPercent.textContent = `${value}%`;
  }

  function setPhotoLoading(active) {
    document.documentElement.toggleAttribute('data-photo-loading', active);
    uploadLayout.hidden = active;
    loading.hidden = !active;
    if (themeColor) themeColor.content = active ? '#beddf3' : uploadThemeColor;
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
    if (!fileUrl) {
      note.textContent = 'Выберите фото.';
      fileInput.focus();
      return;
    }
    const selectedMode = photoForm.elements.mode.value;
    const photo = fileInput.files[0];
    setPhotoLoading(true);
    loadingTitle.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setProgress(Math.min(98, Math.floor(elapsed / demoLoadingDuration * 100)));
    }, 100);
    previewTimer = timer;
    try {
      const { createWatermarkedJpeg } = await import('./santa-preview-image.js');
      const jpeg = await createWatermarkedJpeg(photo);
      const remaining = demoLoadingDuration - (performance.now() - startedAt);
      if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining));
      if (previewTimer !== timer) return;
      const id = crypto.randomUUID();
      sessionStorage.setItem(previewStorageKey, JSON.stringify({ id, mode: selectedMode, jpeg }));
      window.clearInterval(timer);
      setProgress(100);
      location.href = orderUrl('preview', selectedMode, undefined, id);
    } catch {
      if (previewTimer !== timer) return;
      window.clearInterval(timer);
      previewTimer = undefined;
      setProgress(0);
      setPhotoLoading(false);
      note.textContent = 'Не удалось создать превью. Попробуйте выбрать фото в JPG, PNG или WebP.';
      fileInput.focus();
    }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || previewTimer === undefined) return;
    window.clearInterval(previewTimer);
    previewTimer = undefined;
    setPhotoLoading(false);
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

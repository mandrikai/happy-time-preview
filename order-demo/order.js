const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'ordinary' ? 'ordinary' : 'sleeping';
const product = params.get('product') === 'print' ? 'print' : 'pdf';
const isPrint = product === 'print';

function orderUrl(page, selectedMode = mode, selectedProduct) {
  const query = new URLSearchParams({ mode: selectedMode });
  if (selectedProduct) query.set('product', selectedProduct);
  return `${page}.html?${query}`;
}

document.querySelectorAll('[data-sample]').forEach(image => {
  image.src = `assets/${mode}-result.jpg`;
});
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
  const image = document.getElementById('picked-photo');
  const note = document.getElementById('file-note');
  const demoLoadingDuration = 6000;
  let fileUrl;
  let previewTimer;

  function setProgress(value) {
    progressBar.setAttribute('aria-valuenow', value);
    progressBar.style.setProperty('--photo-progress', `${value}%`);
    progressPercent.textContent = `${value}%`;
  }

  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = URL.createObjectURL(fileInput.files[0]);
    image.src = fileUrl;
    image.hidden = false;
    note.textContent = 'Файл выбран.';
  });
  image.addEventListener('error', () => {
    image.hidden = true;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = undefined;
    fileInput.value = '';
    note.textContent = 'Файл не открылся. Выберите другое фото.';
  });
  photoForm.addEventListener('submit', event => {
    event.preventDefault();
    if (previewTimer !== undefined) return;
    if (!fileUrl) {
      note.textContent = 'Выберите фото.';
      fileInput.focus();
      return;
    }
    const previewUrl = orderUrl('preview', photoForm.elements.mode.value);
    uploadLayout.hidden = true;
    loading.hidden = false;
    loadingTitle.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    const startedAt = performance.now();
    previewTimer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const progress = Math.min(100, Math.floor(elapsed / demoLoadingDuration * 100));
      setProgress(progress);
      if (progress === 100) {
        window.clearInterval(previewTimer);
        location.href = previewUrl;
      }
    }, 100);
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted || previewTimer === undefined) return;
    window.clearInterval(previewTimer);
    previewTimer = undefined;
    loading.hidden = true;
    uploadLayout.hidden = false;
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
if (download) download.href = `assets/${mode}-example.pdf`;

const docBack = document.querySelector('[data-doc-back]');
if (docBack && document.referrer) {
  const previous = new URL(document.referrer);
  const localReferrer = new URL(previous.pathname.split('/').pop(), location.href);
  const previousPage = previous.pathname.split('/').pop();
  if (previous.href.startsWith(localReferrer.href) &&
      ['index.html', 'preview.html', 'checkout.html', 'order.html'].includes(previousPage)) {
    docBack.href = localReferrer.pathname.split('/').pop() + previous.search;
  }
}

const hints = {
  sleeping: 'Выберите фото спящего ребёнка, на котором хорошо видно лицо.',
  ordinary: 'Выберите чёткое фото ребёнка без фильтров. Черты лица на готовом снимке могут заметно отличаться.',
};

const mode = new URLSearchParams(location.search).get('mode');
if (Object.hasOwn(hints, mode)) {
  setupUpload(mode);
} else {
  location.replace('santa.html');
}

function setupUpload(mode) {
  const form = document.querySelector('#santa-form');
  const file = document.querySelector('#santa-file');
  const preview = document.querySelector('#santa-preview');
  const pickerText = document.querySelector('#santa-picker-text');
  const fileHint = document.querySelector('#santa-file-hint');
  const filename = document.querySelector('#santa-filename');
  const fileError = document.querySelector('#santa-file-error');
  const consent = document.querySelector('#santa-consent');
  const code = document.querySelector('#santa-code');
  const submitButton = document.querySelector('#santa-submit');
  const statusLine = document.querySelector('#santa-status');
  const result = document.querySelector('#santa-result');
  const resultTitle = document.querySelector('#santa-result-title');
  const types = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const formatError = 'Выберите JPG, PNG, WebP или HEIC размером до 7 МБ.';

  document.querySelector('#santa-instructions').textContent = hints[mode];
  document.body.dataset.santaMode = mode;
  form.hidden = false;

  let previewUrl;
  const isHeic = (photo) => !types.has(photo.type) &&
    (/^image\/hei[cf](?:-sequence)?$/i.test(photo.type) || /\.hei[cf]$/i.test(photo.name));
  const validPhoto = (photo) => photo && (types.has(photo.type) || isHeic(photo)) && photo.size > 0 && photo.size <= 7_000_000;

  preview.addEventListener('load', () => { preview.hidden = false; });

  function setStatus(message, state) {
    statusLine.dataset.state = state;
    statusLine.textContent = message;
  }

  file.addEventListener('change', () => {
    let photo = file.files[0];
    fileError.textContent = '';
    result.hidden = true;
    setStatus('', 'idle');

    if (photo && !validPhoto(photo)) {
      file.value = '';
      photo = null;
      fileError.textContent = formatError;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = photo ? URL.createObjectURL(photo) : null;
    preview.hidden = true;
    if (previewUrl) preview.src = previewUrl;
    else preview.removeAttribute('src');

    fileHint.hidden = !!photo;
    filename.hidden = !photo;
    filename.textContent = photo?.name || '';
    pickerText.textContent = photo ? 'Заменить фото' : 'Загрузить фото';
    file.setAttribute('aria-describedby', photo ? 'santa-filename santa-file-error' : 'santa-file-hint santa-file-error');
  });

  fetch('api/config').then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить настройки сайта.');
    return response.json();
  }).then(({ needCode }) => {
    document.querySelector('#santa-code-field').hidden = !needCode;
    code.required = needCode;
  }).catch(() => {
    if (!submitButton.disabled) setStatus('Не удалось загрузить настройки сайта.', 'error');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    const photo = file.files[0];
    if (!validPhoto(photo)) {
      fileError.textContent = formatError;
      file.focus();
      return;
    }
    const controls = [file, consent, code, submitButton];
    for (const control of controls) control.disabled = true;
    result.hidden = true;
    setStatus('Готовим фото. Оставьте страницу открытой.', 'pending');
    try {
      const input = isHeic(photo) ? new Blob([photo], { type: 'image/heic' }) : photo;
      const response = await fetch('api/santa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          photo: await dataUrl(input),
          consent: consent.checked,
          code: code.value.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось начать обработку');
      const endpoint = 'api/santa/' + encodeURIComponent(data.id);
      for (let attempt = 0; attempt < 180; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const reply = await fetch(endpoint);
        const state = await reply.json();
        if (!reply.ok || state.status === 'failed') throw new Error(state.error || 'Не удалось создать фото.');
        if (state.status === 'done') {
          document.querySelector('#santa-photo').src = `${endpoint}/photo`;
          document.querySelector('#santa-download').href = `${endpoint}/photo?download=1`;
          result.hidden = false;
          setStatus('', 'idle');
          resultTitle.focus();
          return;
        }
      }
      throw new Error('Обработка занимает больше времени, чем ожидалось.');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      for (const control of controls) control.disabled = false;
    }
  });
}

function dataUrl(photo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', () => reject(new Error('Не удалось прочитать фото')));
    reader.readAsDataURL(photo);
  });
}

const hints = {
  sleeping: 'Выберите фото спящего ребёнка, на котором хорошо видно лицо.',
  ordinary: 'Выберите чёткое фото ребёнка без фильтров. Черты лица на готовом снимке могут заметно отличаться.',
};

const mode = new URLSearchParams(location.search).get('mode');
if (Object.hasOwn(hints, mode)) {
  document.querySelector('#santa-instructions').textContent = hints[mode];
  document.body.dataset.santaMode = mode;
  document.querySelector('#santa-form').hidden = false;
} else {
  location.replace('santa.html');
}

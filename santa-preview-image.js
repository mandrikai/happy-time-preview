export async function createWatermarkedJpeg(photo) {
  const source = URL.createObjectURL(photo);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();

    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const photoWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const photoHeight = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(96, photoWidth);
    canvas.height = Math.max(64, photoHeight);
    const { width, height } = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#f4eee3';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, (width - photoWidth) / 2, (height - photoHeight) / 2, photoWidth, photoHeight);

    await document.fonts.load('850 16px Nunito').catch(() => []);
    const columns = Math.max(1, Math.min(6, Math.floor(width / 96), Math.round(3 * width / Math.min(width, height))));
    const rows = Math.min(12, Math.max(1, Math.round(height / width * columns * 1.1)));
    const size = Math.min(width / columns / 7, height / rows / 2.5);
    context.font = `850 ${size}px Nunito, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(255, 248, 236, .72)';
    context.shadowColor = 'rgba(66, 39, 60, .75)';
    context.shadowBlur = Math.max(1, size / 9);
    context.shadowOffsetY = Math.max(1, size / 16);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        context.save();
        context.translate((column + .5) * width / columns, (row + .5) * height / rows);
        context.rotate(-26 * Math.PI / 180);
        context.fillText('Happy Time', 0, 0);
        context.restore();
      }
    }
    return canvas.toDataURL('image/jpeg', .88);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function drawPreviewJpeg(canvas, jpeg) {
  const image = new Image();
  image.src = jpeg;
  await image.decode();
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d').drawImage(image, 0, 0);
}

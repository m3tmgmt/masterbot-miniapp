// Утилита сжатия изображений через Canvas API
// Ресайз + поиск оптимального JPEG quality для целевого размера < 1MB
// Без внешних зависимостей — только браузерный Canvas API

const MAX_DIMENSION = 1920;         // Максимальная сторона (px)
const FALLBACK_DIMENSION = 1280;    // Если при MAX_DIMENSION всё ещё > target
const PREVIEW_MAX_DIM = 400;        // Превью для отображения в UI
const PREVIEW_QUALITY = 0.6;        // Качество превью
const TARGET_SIZE = 1_000_000;      // 1MB в байтах
const QUALITY_MAX = 0.85;
const QUALITY_MIN = 0.3;
const MAX_ITERATIONS = 5;
const MAX_RAW_SIZE = 20_000_000;    // 20MB — лимит для предотвращения OOM

/** Результат сжатия */
export interface CompressResult {
  /** Сжатый blob (JPEG) */
  blob: Blob;
  /** Base64 data URL превью (маленький, для отображения) */
  preview: string;
  /** Размер оригинала (байты) */
  originalSize: number;
  /** Размер после сжатия (байты) */
  compressedSize: number;
}

/** Загрузка Image из src */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
    img.src = src;
  });
}

/** Расчёт пропорциональных размеров */
function calculateDimensions(
  width: number,
  height: number,
  maxDim: number,
): { w: number; h: number } {
  if (width <= maxDim && height <= maxDim) return { w: width, h: height };
  const ratio = Math.min(maxDim / width, maxDim / height);
  return { w: Math.round(width * ratio), h: Math.round(height * ratio) };
}

/** Canvas → Blob (Promise обёртка над toBlob) */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob вернул null'))),
      'image/jpeg',
      quality,
    );
  });
}

/** Рисование на canvas с ресайзом */
function drawToCanvas(
  img: HTMLImageElement,
  maxDim: number,
): HTMLCanvasElement {
  const { w, h } = calculateDimensions(img.naturalWidth, img.naturalHeight, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context недоступен');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Сжимает изображение до целевого размера.
 * Использует ресайз + бинарный поиск JPEG quality.
 *
 * @param file — File из <input type="file">
 * @param maxBytes — целевой размер (по умолчанию 1MB)
 * @returns CompressResult с blob, preview и метаинформацией
 */
export async function compressImage(
  file: File,
  maxBytes: number = TARGET_SIZE,
): Promise<CompressResult> {
  // Валидация
  if (!file.type.startsWith('image/')) {
    throw new Error('Файл не является изображением');
  }
  if (file.size > MAX_RAW_SIZE) {
    throw new Error('Файл слишком большой (максимум 20MB)');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    // Генерация превью (маленький canvas)
    const previewCanvas = drawToCanvas(img, PREVIEW_MAX_DIM);
    const preview = previewCanvas.toDataURL('image/jpeg', PREVIEW_QUALITY);

    // Основной canvas (полноразмерный ресайз)
    let mainCanvas = drawToCanvas(img, MAX_DIMENSION);
    let blob = await findOptimalBlob(mainCanvas, maxBytes);

    // Fallback: если после бинарного поиска всё ещё > target, уменьшить ещё
    if (blob.size > maxBytes) {
      mainCanvas = drawToCanvas(img, FALLBACK_DIMENSION);
      blob = await findOptimalBlob(mainCanvas, maxBytes);
    }

    return {
      blob,
      preview,
      originalSize: file.size,
      compressedSize: blob.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Бинарный поиск оптимального JPEG quality */
async function findOptimalBlob(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob> {
  // Сначала проверяем максимальное качество
  let blob = await canvasToBlob(canvas, QUALITY_MAX);
  if (blob.size <= maxBytes) return blob;

  // Бинарный поиск
  let low = QUALITY_MIN;
  let high = QUALITY_MAX;
  let bestBlob = blob;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    blob = await canvasToBlob(canvas, mid);

    if (blob.size <= maxBytes) {
      bestBlob = blob;
      low = mid; // Попробовать лучшее качество
    } else {
      high = mid; // Уменьшить качество
    }
  }

  // Финальная попытка с минимальным качеством если ничего не подошло
  if (bestBlob.size > maxBytes) {
    bestBlob = await canvasToBlob(canvas, QUALITY_MIN);
  }

  return bestBlob;
}

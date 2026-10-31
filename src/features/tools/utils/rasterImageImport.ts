import { loadImageTracer } from './imageTracer';
import { parseSvg } from './normalizeTracedSvg';
import { VectorShape } from './svgPainter';

export function fitRasterImage(imageWidth: number, imageHeight: number, boardWidth: number, boardHeight: number) {
  const scale = Math.min(boardWidth / imageWidth, boardHeight / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return { x: (boardWidth - width) / 2, y: (boardHeight - height) / 2, width, height };
}

export function tracedImageShapes(source: string): VectorShape[] {
  const svg = parseSvg(source);
  const shapes: VectorShape[] = [];
  for (const path of svg.querySelectorAll('path')) {
    const opacity = Number(path.getAttribute('opacity') ?? '1');
    if (!Number.isFinite(opacity) || opacity <= 0) continue;
    const d = path.getAttribute('d') || '';
    const fill = path.getAttribute('fill') || '';
    const rgb = fill.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
    const hex = rgb ? '#' + rgb.slice(1).map(value => Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, '0')).join('') : fill.toLowerCase();
    // Copy only vector geometry and paint, never raw markup or embedded images.
    if (!/^[MmLlHhVvCcSsQqTtAaZzEe\d\s,.+\-]+$/.test(d) || !/^#[\da-f]{6}$/.test(hex)) continue;
    shapes.push({ id: crypto.randomUUID(), d, fill: hex, stroke: 'none', strokeWidth: 0, opacity: Math.min(1, opacity), x: 0, y: 0 });
  }
  if (!shapes.length) throw new Error('Không tìm thấy vùng ảnh có thể chuyển thành vector. Ảnh có thể hoàn toàn trong suốt.');
  return shapes;
}

export async function importRasterImage(file: File, width: number, height: number, numberOfColors: number): Promise<VectorShape[]> {
  if (!/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)) throw new Error('Hãy chọn ảnh PNG, JPG, WebP, GIF, BMP hoặc AVIF.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Ảnh tối đa 20 MB. Hãy giảm dung lượng rồi thử lại.');
  return traceImageBlob(file, width, height, numberOfColors);
}

export async function traceImageBlob(file: Blob, width: number, height: number, numberOfColors: number): Promise<VectorShape[]> {
  const tracer = await loadImageTracer();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không đọc được ảnh. File có thể bị hỏng hoặc định dạng chưa được trình duyệt hỗ trợ.'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Ảnh quá lớn hoặc có kích thước không hợp lệ. Hãy giảm kích thước rồi thử lại.');

    const scale = Math.min(1, 512 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Không thể tạo vùng xử lý ảnh.');
    const fit = fitRasterImage(image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
    context.drawImage(image, fit.x, fit.y, fit.width, fit.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    // Give the loading state an opportunity to paint before tracing begins.
    await new Promise(resolve => setTimeout(resolve, 0));
    return tracedImageShapes(tracer.imagedataToSVG(pixels, {
      numberofcolors: numberOfColors, colorsampling: 2, colorquantcycles: 5,
      mincolorratio: 0, ltres: 0.5, qtres: 0.5, pathomit: 2,
      strokewidth: 0, roundcoords: 2, scale: 1 / scale,
    }));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Point = { x: number; y: number };
export type EraserStroke = { d: string; strokeWidth: number; x: number; y: number };
export type VectorBounds = { x: number; y: number; width: number; height: number };
export type VectorShape = {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  x: number;
  y: number;
  erasures?: EraserStroke[];
  maskBounds?: VectorBounds;
  transform?: string;
  fillRule?: 'evenodd' | 'nonzero';
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeLinejoin?: 'round' | 'miter' | 'bevel';
};

export const coordinate = (n: number) => Number(n.toFixed(2));

export function eraseShapes(shapes: VectorShape[], eraser: Pick<VectorShape, 'd' | 'strokeWidth'>, targets?: ReadonlySet<string>, bounds?: ReadonlyMap<string, VectorBounds>): VectorShape[] {
  let changed = false;
  const result = shapes.map(shape => {
    if (targets && !targets.has(shape.id)) return shape;
    changed = true;
    const erasures = shape.erasures || [];
    const last = erasures[erasures.length - 1];
    const next = { d: eraser.d, strokeWidth: eraser.strokeWidth, x: -shape.x, y: -shape.y };
    // Adjacent passes with the same size/offset are independent black subpaths
    // in one mask path, so repeated erasing does not add a node every time.
    const merged = last && last.strokeWidth === next.strokeWidth && last.x === next.x && last.y === next.y;
    const box = bounds?.get(shape.id);
    const maskBounds = box ? { ...box, x: box.x - shape.x, y: box.y - shape.y } : shape.maskBounds;
    return { ...shape, maskBounds, erasures: merged ? [...erasures.slice(0, -1), { ...next, d: `${last.d} ${next.d}` }] : [...erasures, next] };
  });
  return changed ? result : shapes;
}

export function eraserTargets(shapes: VectorShape[], bounds: ReadonlyMap<string, VectorBounds>, points: Point[], strokeWidth: number): Set<string> {
  const targets = new Set<string>();
  const radius = strokeWidth / 2;
  for (const shape of shapes) {
    const box = bounds.get(shape.id);
    if (!box) { targets.add(shape.id); continue; }
    const minX = box.x - radius, minY = box.y - radius;
    const maxX = box.x + box.width + radius, maxY = box.y + box.height + radius;
    for (let index = 0; index < points.length; index++) {
      const a = points[Math.max(0, index - 1)], b = points[index];
      // Clip the swept segment to an expanded box. Checking only the points
      // would miss shapes crossed by fast pointer movement.
      let low = 0, high = 1;
      const delta = [b.x - a.x, b.y - a.y], origin = [a.x, a.y];
      for (let axis = 0; axis < 2; axis++) {
        const minimum = axis === 0 ? minX : minY, maximum = axis === 0 ? maxX : maxY;
        if (!delta[axis]) { if (origin[axis] < minimum || origin[axis] > maximum) { low = 1; high = 0; break; } }
        else {
          const one = (minimum - origin[axis]) / delta[axis], two = (maximum - origin[axis]) / delta[axis];
          low = Math.max(low, Math.min(one, two)); high = Math.min(high, Math.max(one, two));
        }
      }
      if (low <= high) { targets.add(shape.id); break; }
    }
  }
  return targets;
}

export function eraserMaskBounds(shape: VectorShape, width: number, height: number) {
  return shape.maskBounds || { x: -shape.x - 128, y: -shape.y - 128, width: width + 256, height: height + 256 };
}

export function strokePath(points: Point[], closed = false): string {
  if (!points.length) return '';
  const commands = points.map((p, i) => `${i ? 'L' : 'M'} ${coordinate(p.x)} ${coordinate(p.y)}`);
  if (points.length === 1) commands.push(`l 0.01 0`);
  return `${commands.join(' ')}${closed ? ' Z' : ''}`;
}

export function geometryPath(tool: string, start: Point, end: Point): string {
  const x = coordinate(Math.min(start.x, end.x));
  const y = coordinate(Math.min(start.y, end.y));
  const w = coordinate(Math.abs(end.x - start.x));
  const h = coordinate(Math.abs(end.y - start.y));
  if (tool === 'line') return strokePath([start, end]);
  if (tool === 'ellipse') {
    const rx = coordinate(w / 2), ry = coordinate(h / 2), cy = coordinate(y + h / 2);
    if (!rx || !ry) return '';
    return `M ${x} ${cy} a ${rx} ${ry} 0 1 0 ${w} 0 a ${rx} ${ry} 0 1 0 ${-w} 0 Z`;
  }
  return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
}

export function drawingSvg(shapes: VectorShape[], width: number, height: number, background: string, currentColor?: string): string {
  // Only generated numeric path data and validated hex colors enter the document.
  const paint = (color: string) => color === currentColor ? 'currentColor' : /^(#[\da-f]{6}|none)$/i.test(color) ? color : 'none';
  const lines = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  const maskedShapes = shapes.filter(shape => shape.erasures?.length);
  if (maskedShapes.length) {
    lines.push('  <defs>');
    for (const shape of maskedShapes) {
      const bounds = eraserMaskBounds(shape, width, height);
      lines.push(`    <mask id="erase-${shape.id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${coordinate(bounds.x)}" y="${coordinate(bounds.y)}" width="${bounds.width}" height="${bounds.height}" mask-type="luminance">`);
      lines.push(`      <rect x="${coordinate(bounds.x)}" y="${coordinate(bounds.y)}" width="${bounds.width}" height="${bounds.height}" fill="#ffffff" />`);
      for (const erasure of shape.erasures!) {
        lines.push(`      <path d="${erasure.d}" fill="none" stroke="#000000" stroke-width="${coordinate(erasure.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${coordinate(erasure.x)} ${coordinate(erasure.y)})" />`);
      }
      lines.push('    </mask>');
    }
    lines.push('  </defs>');
  }
  if (background !== 'none') lines.push(`  <rect width="${width}" height="${height}" fill="${paint(background)}" />`);
  for (const shape of shapes) {
    const mask = shape.erasures?.length ? ` mask="url(#erase-${shape.id})"` : '';
    const path = `<path d="${shape.d}" fill="${paint(shape.fill)}" stroke="${paint(shape.stroke)}" stroke-width="${shape.transform ? Number(shape.strokeWidth.toPrecision(15)) : coordinate(shape.strokeWidth)}" stroke-linecap="${shape.strokeLinecap || 'round'}" stroke-linejoin="${shape.strokeLinejoin || 'round'}" fill-rule="${shape.fillRule || 'evenodd'}" opacity="${shape.transform ? Number(shape.opacity.toPrecision(15)) : coordinate(shape.opacity)}"`;
    if (shape.transform) {
      lines.push(`  <g transform="translate(${coordinate(shape.x)} ${coordinate(shape.y)})"${mask}>`);
      lines.push(`    ${path} transform="${shape.transform}" />`);
      lines.push('  </g>');
    } else lines.push(`  ${path} transform="translate(${coordinate(shape.x)} ${coordinate(shape.y)})"${mask} />`);
  }
  lines.push('</svg>');
  return lines.join('\n');
}

export async function rasterizeDrawing(svg: string, width: number, height: number, previewColor = '#000000'): Promise<ImageData> {
  const coloredSvg = svg.replace('<svg ', `<svg color="${/^#[\da-f]{6}$/i.test(previewColor) ? previewColor : '#000000'}" `);
  const url = URL.createObjectURL(new Blob([coloredSvg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể đọc bản vẽ. Hãy thử lại.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Trình duyệt không hỗ trợ đọc vùng màu.');
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Flood fill is used only to find a region. Its boundary is exported as vector paths. */
export function regionPath(image: Pick<ImageData, 'width' | 'height' | 'data'>, point: Point, tolerance: number, scale = 1): string {
  const { width, height, data } = image;
  const sx = Math.max(0, Math.min(width - 1, Math.floor(point.x)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(point.y)));
  const seed = (sy * width + sx) * 4;
  const differences = new Float32Array(width * height);
  const seedAlpha = data[seed + 3] / 255;
  for (let index = 0; index < differences.length; index++) {
    const offset = index * 4, alpha = data[offset + 3] / 255;
    // Premultiplied colors make all fully transparent pixels equivalent.
    differences[index] = Math.max(Math.abs(data[offset + 3] - data[seed + 3]),
      Math.abs(data[offset] * alpha - data[seed] * seedAlpha),
      Math.abs(data[offset + 1] * alpha - data[seed + 1] * seedAlpha),
      Math.abs(data[offset + 2] * alpha - data[seed + 2] * seedAlpha));
  }
  const visited = new Uint8Array(width * height);
  const region = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let size = 1;
  stack[0] = sy * width + sx;
  visited[stack[0]] = 1;
  while (size) {
    const index = stack[--size];
    if (differences[index] > tolerance) continue;
    region[index] = 1;
    const x = index % width, y = Math.floor(index / width);
    const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
    for (const next of neighbors) {
      if (next >= 0 && !visited[next]) {
        visited[next] = 1;
        stack[size++] = next;
      }
    }
  }

  // The flood threshold deliberately stops before antialiased line pixels.
  // Include the partial-coverage fringe as well, without crossing the darkest
  // part of a boundary or flooding a second disconnected area of the seed color.
  for (let pass = 0; tolerance > 0 && pass < Math.ceil(scale); pass++) {
    const additions: number[] = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (region[index]) continue;
      let touching = 0, furthest = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const neighbor = (y + dy) * width + x + dx;
        if (region[neighbor]) touching++;
        furthest = Math.max(furthest, differences[neighbor]);
      }
      if (!touching) continue;
      const delta = differences[index];
      if ((delta > tolerance && delta + 1 < furthest)
        || (delta <= tolerance && touching >= 5)) additions.push(index);
    }
    for (const index of additions) region[index] = 1;
    if (!additions.length) break;
  }

  const stride = width + 1;
  const edges = new Map<number, number[]>();
  const add = (from: number, to: number) => {
    const list = edges.get(from);
    if (list) list.push(to); else edges.set(from, [to]);
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    if (!region[index]) continue;
    const tl = y * stride + x, tr = tl + 1, bl = tl + stride, br = bl + 1;
    if (y === 0 || !region[index - width]) add(tl, tr);
    if (x === width - 1 || !region[index + 1]) add(tr, br);
    if (y === height - 1 || !region[index + width]) add(br, bl);
    if (x === 0 || !region[index - 1]) add(bl, tl);
  }

  const paths: string[] = [];
  while (edges.size) {
    const start = edges.keys().next().value as number;
    const vertices: number[] = [start];
    let current = start;
    let previous = start - 1;
    do {
      const destinations = edges.get(current);
      if (!destinations?.length) throw new Error('Không thể tạo đường biên của vùng tô.');
      // Prefer a right turn at diagonal contacts to keep boundary loops separate.
      const direction = (from: number, to: number) => to === from + 1 ? 0 : to === from + stride ? 1 : to === from - 1 ? 2 : 3;
      const incoming = direction(previous, current);
      destinations.sort((a, b) => {
        const rank = (to: number) => [1, 0, 3, 2].indexOf((direction(current, to) - incoming + 4) % 4);
        return rank(a) - rank(b);
      });
      const next = destinations.shift()!;
      if (!destinations.length) edges.delete(current);
      previous = current;
      current = next;
      vertices.push(current);
    } while (current !== start);

    // Collapse straight runs; a filled rectangle becomes four corners.
    const points = vertices.slice(0, -1).filter((v, index, all) => {
      const prev = all[(index + all.length - 1) % all.length];
      const next = all[(index + 1) % all.length];
      return v - prev !== next - v;
    }).map(v => ({ x: (v % stride) / scale, y: Math.floor(v / stride) / scale }));
    paths.push(strokePath(points, true));
  }
  return paths.join(' ');
}

export function filledRegion(image: Pick<ImageData, 'width' | 'height' | 'data'>, point: Point, color: string, tolerance: number, scale = 1): Pick<VectorShape, 'd' | 'fill' | 'stroke' | 'strokeWidth'> {
  return {
    d: regionPath(image, point, tolerance, scale),
    fill: color,
    // Overlap the two antialiased vector edges by half a document pixel.
    // A fill without this overlap can leave tiny transparent corner seams
    // when the traced boundary is rasterized again by the SVG renderer.
    stroke: tolerance > 0 ? color : 'none',
    strokeWidth: tolerance > 0 ? 1 : 0,
  };
}

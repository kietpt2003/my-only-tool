import { parseSvg } from './normalizeTracedSvg';
import { fitRasterImage, traceImageBlob } from './rasterImageImport';
import { VectorShape } from './svgPainter';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SAFE_TAGS = new Set(('svg g path rect circle ellipse line polyline polygon defs clipPath mask linearGradient radialGradient stop pattern use symbol image text tspan textPath title desc style marker filter feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence').split(' '));

/** Sanitize before either mounting SVG geometry or rendering it into an image. */
export function sanitizeImportedSvg(source: string): SVGSVGElement {
  let svg = parseSvg(source);
  if (!svg.namespaceURI) {
    svg.setAttribute('xmlns', SVG_NAMESPACE);
    svg = parseSvg(new XMLSerializer().serializeToString(svg));
  }
  if (svg.namespaceURI !== SVG_NAMESPACE) throw new Error('SVG có namespace không hợp lệ.');
  for (const element of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    if (element.namespaceURI !== SVG_NAMESPACE || !SAFE_TAGS.has(element.localName)) { element.remove(); continue; }
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.localName) || ['tabindex', 'autofocus', 'classid'].includes(attribute.localName)
        || (attribute.localName === 'base' && attribute.namespaceURI === 'http://www.w3.org/XML/1998/namespace')) {
        element.removeAttributeNode(attribute); continue;
      }
      if (attribute.localName === 'href' && !attribute.value.startsWith('#')
        && !(['image', 'feImage'].includes(element.localName) && /^data:image\/(png|jpe?g|webp|gif|bmp|avif);base64,/i.test(attribute.value))) {
        throw new Error('SVG có tài nguyên bên ngoài. Hãy nhúng ảnh vào file trước khi nhập.');
      }
      validateCssResources(attribute.value);
    }
    if (element.localName === 'style') validateCssResources(element.textContent || '');
    (element as SVGElement).style?.setProperty('animation', 'none', 'important');
  }
  return svg;
}

function validateCssResources(value: string) {
  if (/@import|@font-face|image(?:-set)?\s*\(|expression\s*\(|javascript:|\\|\/\*/i.test(value)
    || Array.from(value.matchAll(/url\(\s*['"]?([^)'"\s]+)[\s'"]*\)/gi)).some(match => !match[1].startsWith('#'))) {
    throw new Error('SVG có liên kết hoặc CSS bên ngoài chưa được hỗ trợ. Hãy xuất SVG độc lập rồi nhập lại.');
  }
}

function solidColor(value: string): { color: string; alpha: number } | null {
  if (value === 'none') return { color: 'none', alpha: 1 };
  const rgb = value.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/);
  if (!rgb) return null;
  return { color: '#' + rgb.slice(1, 4).map(n => Math.round(Number(n)).toString(16).padStart(2, '0')).join(''), alpha: Number(rgb[4] ?? 1) };
}

function geometry(element: SVGGeometryElement): string {
  const number = (name: string) => ((element as unknown as Record<string, SVGAnimatedLength>)[name]?.baseVal.value || 0);
  switch (element.localName) {
    case 'path': return element.getAttribute('d') || '';
    case 'line': return `M ${number('x1')} ${number('y1')} L ${number('x2')} ${number('y2')}`;
    case 'polygon': case 'polyline': {
      const points = (element as SVGPolylineElement).points;
      return Array.from({ length: points.numberOfItems }, (_, i) => `${i ? 'L' : 'M'} ${points.getItem(i).x} ${points.getItem(i).y}`).join(' ') + (element.localName === 'polygon' ? ' Z' : '');
    }
    case 'circle': case 'ellipse': {
      const rx = number(element.localName === 'circle' ? 'r' : 'rx');
      const ry = number(element.localName === 'circle' ? 'r' : 'ry');
      return rx > 0 && ry > 0 ? `M ${number('cx') - rx} ${number('cy')} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z` : '';
    }
    case 'rect': {
      const x = number('x'), y = number('y'), width = number('width'), height = number('height');
      const rx = Math.min(width / 2, element.hasAttribute('rx') ? number('rx') : number('ry'));
      const ry = Math.min(height / 2, element.hasAttribute('ry') ? number('ry') : number('rx'));
      if (width <= 0 || height <= 0) return '';
      if (!rx || !ry) return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
      return `M ${x + rx} ${y} H ${x + width - rx} A ${rx} ${ry} 0 0 1 ${x + width} ${y + ry} V ${y + height - ry} A ${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height} H ${x + rx} A ${rx} ${ry} 0 0 1 ${x} ${y + height - ry} V ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`;
    }
    default: return '';
  }
}

export async function importSvgImage(file: File, width: number, height: number, colors: number): Promise<{ shapes: VectorShape[]; retraced: boolean }> {
  if (file.size > 20 * 1024 * 1024) throw new Error('SVG tối đa 20 MB.');
  const svg = sanitizeImportedSvg(await file.text());
  const viewBox = svg.viewBox.baseVal;
  const explicitWidth = svg.hasAttribute('width') && !svg.getAttribute('width')!.includes('%') ? svg.width.baseVal.value : 0;
  const explicitHeight = svg.hasAttribute('height') && !svg.getAttribute('height')!.includes('%') ? svg.height.baseVal.value : 0;
  const sourceWidth = explicitWidth || (explicitHeight && viewBox.height ? explicitHeight * viewBox.width / viewBox.height : viewBox.width) || 300;
  const sourceHeight = explicitHeight || (explicitWidth && viewBox.width ? explicitWidth * viewBox.height / viewBox.width : viewBox.height) || 150;
  if (sourceWidth <= 0 || sourceHeight <= 0 || !Number.isFinite(sourceWidth + sourceHeight)) throw new Error('SVG có kích thước không hợp lệ.');
  if (!viewBox.width || !viewBox.height) svg.setAttribute('viewBox', `0 0 ${sourceWidth} ${sourceHeight}`);
  const fit = fitRasterImage(sourceWidth, sourceHeight, width, height);
  svg.setAttribute('width', String(fit.width)); svg.setAttribute('height', String(fit.height));
  svg.removeAttribute('x'); svg.removeAttribute('y');
  svg.style.setProperty('width', `${fit.width}px`, 'important'); svg.style.setProperty('height', `${fit.height}px`, 'important');

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none;color:#000';
  host.setAttribute('aria-hidden', 'true');
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.appendChild(svg); document.body.appendChild(host);
  let shapes: VectorShape[] | null = [];
  try {
    // These constructs need compositing; trace the rendered result rather than
    // dropping effects, holes or embedded raster content during flattening.
    if (svg.querySelector('image, use, text, textPath, linearGradient, radialGradient, pattern, clipPath, mask, filter, marker, svg')) shapes = null;
    if (Array.from(svg.querySelectorAll('*')).some(node => /(?:^|[;{])\s*(?:x|y|cx|cy|r|rx|ry|width|height|d)\s*:/.test(node.localName === 'style' ? node.textContent || '' : node.getAttribute('style') || ''))) shapes = null;
    if ([svg, ...Array.from(svg.querySelectorAll('g'))].some(node => Number(getComputedStyle(node).opacity) !== 1)) shapes = null;
    if (shapes) for (const node of Array.from(svg.querySelectorAll<SVGGeometryElement>('path, rect, circle, ellipse, line, polyline, polygon'))) {
      if (node.closest('defs, symbol')) continue;
      const style = getComputedStyle(node);
      let hidden = style.visibility === 'hidden';
      for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) if (getComputedStyle(ancestor).display === 'none') hidden = true;
      if (hidden) continue;
      if (style.filter !== 'none' || style.clipPath !== 'none' || style.maskImage !== 'none' || style.strokeDasharray !== 'none' || style.vectorEffect !== 'none'
        || Number(style.strokeMiterlimit) !== 4 || (style.paintOrder !== 'normal' && style.paintOrder !== 'fill stroke markers')) { shapes = null; break; }
      const fill = solidColor(style.fill), stroke = solidColor(style.stroke);
      const matrix = node.getCTM();
      const d = geometry(node);
      if (!fill || !stroke || !matrix || ![matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(Number.isFinite) || !/^[MmLlHhVvCcSsQqTtAaZzEe\d\s,.+\-]*$/.test(d)) { shapes = null; break; }
      if (!d) continue;
      const bounds = node.getBBox();
      const strokePad = stroke.color === 'none' ? 0 : parseFloat(style.strokeWidth) / 2;
      const corners = [[bounds.x - strokePad, bounds.y - strokePad], [bounds.x + bounds.width + strokePad, bounds.y - strokePad], [bounds.x - strokePad, bounds.y + bounds.height + strokePad], [bounds.x + bounds.width + strokePad, bounds.y + bounds.height + strokePad]];
      if (corners.some(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return p.x < -0.01 || p.y < -0.01 || p.x > fit.width + 0.01 || p.y > fit.height + 0.01; })) { shapes = null; break; }
      matrix.e += fit.x; matrix.f += fit.y;
      const transform = `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].map(n => Number(n.toPrecision(15))).join(' ')})`;
      const base = { d, transform, x: 0, y: 0, strokeWidth: parseFloat(style.strokeWidth), fillRule: style.fillRule as 'evenodd' | 'nonzero', strokeLinecap: style.strokeLinecap as 'round' | 'butt' | 'square', strokeLinejoin: style.strokeLinejoin as 'round' | 'miter' | 'bevel' };
      if (fill.color !== 'none' && fill.alpha > 0 && Number(style.fillOpacity) > 0) shapes.push({ ...base, id: crypto.randomUUID(), fill: fill.color, stroke: 'none', opacity: Number(style.opacity) * Number(style.fillOpacity) * fill.alpha });
      if (stroke.color !== 'none' && stroke.alpha > 0 && Number(style.strokeOpacity) > 0) shapes.push({ ...base, id: crypto.randomUUID(), fill: 'none', stroke: stroke.color, opacity: Number(style.opacity) * Number(style.strokeOpacity) * stroke.alpha });
    }
    if (shapes?.length) return { shapes, retraced: false };
  } finally { host.remove(); }

  const clean = new XMLSerializer().serializeToString(svg);
  return { shapes: await traceImageBlob(new Blob([clean], { type: 'image/svg+xml' }), width, height, colors), retraced: true };
}

export function parseSvg(source: string): SVGSVGElement {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
    throw new Error('Invalid SVG markup. Please check the input file.');
  }
  return document.documentElement as unknown as SVGSVGElement;
}

export function normalizeTracedSvg(source: string): string {
  const svg = parseSvg(source);

  if (!svg.hasAttribute('viewBox')) {
    const width = Number(svg.getAttribute('width'));
    const height = Number(svg.getAttribute('height'));
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error('The traced SVG has invalid dimensions.');
    }
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');

  for (const shape of svg.querySelectorAll('path, rect')) {
    const fill = shape.getAttribute('fill');
    const opacity = shape.getAttribute('opacity');
    const fillOpacity = shape.getAttribute('fill-opacity');
    // ImageTracer includes transparent palette entries; they add no visible geometry.
    if ((opacity !== null && Number(opacity) === 0)
      || (fillOpacity !== null && Number(fillOpacity) === 0)
      || (fill && /^(?:white|#fff|#ffffff|rgb\(255,\s*255,\s*255\))$/i.test(fill))) {
      shape.remove();
      continue;
    }
    shape.removeAttribute('stroke');
    shape.removeAttribute('stroke-width');
    if (fill && fill !== 'none') shape.setAttribute('fill', 'currentColor');
  }

  return new XMLSerializer().serializeToString(svg);
}

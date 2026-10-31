import { parseSvg } from './normalizeTracedSvg';

export function formatSvg(source: string): string {
  const svg = parseSvg(source);

  const indentChildren = (element: Element, depth: number) => {
    // Keep text content and explicitly preserved whitespace unchanged.
    if (['text', 'tspan', 'style', 'script', 'foreignObject'].includes(element.localName)
      || element.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'space') === 'preserve'
      || Array.from(element.childNodes).some(node =>
        node.nodeType === Node.CDATA_SECTION_NODE
        || (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()))) return;

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) element.removeChild(node);
    }

    const children = Array.from(element.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) indentChildren(child as Element, depth + 1);
      element.insertBefore(element.ownerDocument.createTextNode(`\n${'  '.repeat(depth + 1)}`), child);
    }
    if (children.length) element.appendChild(element.ownerDocument.createTextNode(`\n${'  '.repeat(depth)}`));
  };

  indentChildren(svg, 0);
  return new XMLSerializer().serializeToString(svg);
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/tools/utils/svgPainter.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });
const { drawingSvg, eraseShapes, eraserTargets, eraserMaskBounds, regionPath, filledRegion, geometryPath, strokePath } = api;
const shape = (values = {}) => ({ id: 'test', d: 'M 1 1 L 10 10', fill: '#ef4444', stroke: '#0f172a', strokeWidth: 4, opacity: 0.5, x: 2, y: 3, ...values });
const pixels = (width, height, colorAt) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(colorAt(x, y), (y * width + x) * 4);
  return { width, height, data };
};

test('export maps only the chosen color, preserves opacity and formats vector tags', () => {
  const svg = drawingSvg([shape(), shape({ stroke: '#ef4444', fill: 'none' })], 800, 600, '#ffffff', '#ef4444');
  assert.equal((svg.match(/currentColor/g) || []).length, 2);
  assert.match(svg, /fill="none"/);
  assert.match(svg, /stroke="#0f172a"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.match(svg, /opacity="0.5"/);
  assert.match(svg, /transform="translate\(2 3\)"/);
  assert.equal(svg.split('\n').length, 5);
  assert.doesNotMatch(svg, /<image|data:|foreignObject|<canvas|style=/i);
  assert.doesNotMatch(drawingSvg([shape()], 32, 32, 'none'), /currentColor|<rect/);
});

test('flood fill stays within a closed boundary and collapses straight edges', () => {
  const image = pixels(7, 7, (x, y) => x === 1 || x === 5 || y === 1 || y === 5 ? [0, 0, 0, 255] : [0, 0, 0, 0]);
  const d = regionPath(image, { x: 3, y: 3 }, 0);
  assert.equal(d, 'M 2 2 L 5 2 L 5 5 L 2 5 Z');
});

test('flood fill represents holes as closed subpaths and ignores hidden RGB in transparent pixels', () => {
  const image = pixels(5, 5, (x, y) => x === 2 && y === 2 ? [0, 0, 0, 255] : [x * 30, y * 30, 255, 0]);
  const d = regionPath(image, { x: 0, y: 0 }, 0);
  assert.equal((d.match(/M /g) || []).length, 2);
  assert.equal((d.match(/Z/g) || []).length, 2);
  assert.match(d, /M 0 0 L 5 0 L 5 5 L 0 5 Z/);
});

test('flood fill tolerance and connectivity distinguish neighboring colors', () => {
  const image = pixels(3, 1, x => [x === 0 ? 100 : x === 1 ? 110 : 200, 0, 0, 255]);
  assert.equal(regionPath(image, { x: 0, y: 0 }, 15), 'M 0 0 L 2 0 L 2 1 L 0 1 Z');
  assert.equal(regionPath(image, { x: 0, y: 0 }, 0), 'M 0 0 L 1 0 L 1 1 L 0 1 Z');
});

test('geometry supports reversed drags, closed regions and single brush dots', () => {
  assert.equal(geometryPath('rect', { x: 20, y: 30 }, { x: 10, y: 10 }), 'M 10 10 h 10 v 20 h -10 Z');
  assert.match(geometryPath('ellipse', { x: 0, y: 0 }, { x: 20, y: 10 }), /a 10 5/);
  assert.equal(geometryPath('ellipse', { x: 0, y: 0 }, { x: 0, y: 10 }), '');
  assert.match(strokePath([{ x: 1, y: 2 }]), /l 0.01 0/);
  assert.match(strokePath([{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }], true), / Z$/);
});

test('fill includes antialiased inner fringe without crossing opaque outlines', () => {
  for (const opaqueBackground of [false, true]) {
    const image = pixels(9, 9, (x, y) => {
      const ring = Math.min(x, y, 8 - x, 8 - y);
      const alpha = ring === 1 ? 255 : ring === 2 ? 120 : 0;
      return opaqueBackground ? [255 - alpha, 255 - alpha, 255 - alpha, 255] : [0, 0, 0, alpha];
    });
    const filled = filledRegion(image, { x: 4, y: 4 }, '#ef4444', 32);
    assert.equal(filled.d, 'M 2 2 L 7 2 L 7 7 L 2 7 Z');
    assert.equal(filled.stroke, filled.fill);
    assert.equal(filled.strokeWidth, 1);
    assert.equal(filledRegion(image, { x: 4, y: 4 }, '#ef4444', 0).d, 'M 3 3 L 6 3 L 6 6 L 3 6 Z');
  }
});

test('higher-resolution tracing exports coordinates in document units', () => {
  const image = pixels(14, 14, (x, y) => x < 2 || x >= 12 || y < 2 || y >= 12 ? [0, 0, 0, 255] : [0, 0, 0, 0]);
  assert.equal(regionPath(image, { x: 6, y: 6 }, 0, 2), 'M 1 1 L 6 1 L 6 6 L 1 6 Z');
});

test('eraser preserves history and cuts existing shapes with vector masks', () => {
  const original = [shape()];
  const erased = eraseShapes(original, { d: 'M 10 10 L 30 10', strokeWidth: 12 });
  assert.equal(original[0].erasures, undefined);
  assert.equal(erased[0].d, original[0].d);
  assert.equal(erased[0].erasures[0].x, -2);
  assert.equal(erased[0].erasures[0].y, -3);
  const twice = eraseShapes(erased, { d: 'M 20 20 l 0.01 0', strokeWidth: 24 });
  assert.equal(erased[0].erasures.length, 1);
  assert.equal(twice[0].erasures.length, 2);
  const svg = drawingSvg([...twice, shape({ id: 'new' })], 100, 100, 'none', '#ef4444');
  assert.match(svg, /<mask id="erase-test"/);
  assert.match(svg, /mask="url\(#erase-test\)"/);
  assert.doesNotMatch(svg, /erase-new/);
  assert.match(svg, /fill="currentColor"/);
  assert.match(svg, /stroke="#000000" stroke-width="12"/);
  assert.doesNotMatch(svg, /<image|data:image|foreignObject|<canvas/);
});

test('imported vector transforms keep masks in board coordinates and preserve paint semantics', () => {
  const imported = shape({ id: 'native', transform: 'matrix(8 0 0 8 0 200)', fillRule: 'nonzero', strokeLinecap: 'butt', strokeLinejoin: 'miter' });
  const [erased] = eraseShapes([imported], { d: 'M 600 390 L 600 410', strokeWidth: 24 });
  const svg = drawingSvg([erased], 800, 800, 'none', '#ef4444');
  assert.match(svg, /<g transform="translate\(2 3\)" mask="url\(#erase-native\)">\n    <path/);
  assert.match(svg, /transform="matrix\(8 0 0 8 0 200\)"/);
  assert.match(svg, /fill-rule="nonzero"/);
  assert.match(svg, /stroke-linecap="butt" stroke-linejoin="miter"/);
  assert.match(svg, /fill="currentColor"/);
  assert.match(svg, /stroke="#0f172a"/);
  assert.equal(erased.erasures[0].x, -2);
  assert.equal(erased.erasures[0].y, -3);
});

test('eraser only changes intersected shapes and retains references for unaffected artwork', () => {
  const shapes = [shape({ id: 'hit', x: 10, y: 20 }), shape({ id: 'far' })];
  const bounds = new Map([
    ['hit', { x: 40, y: 40, width: 10, height: 10 }],
    ['far', { x: 0, y: 80, width: 10, height: 10 }],
  ]);
  const targets = eraserTargets(shapes, bounds, [{ x: 0, y: 0 }, { x: 100, y: 100 }], 2);
  assert.equal(targets.has('hit'), true);
  assert.equal(targets.has('far'), false);
  const erased = eraseShapes(shapes, { d: 'M 0 0 L 100 100', strokeWidth: 2 }, targets, bounds);
  assert.notEqual(erased[0], shapes[0]);
  assert.equal(erased[1], shapes[1]);
  assert.equal(eraserMaskBounds(erased[0], 800, 800).x, 30);
  assert.equal(eraserMaskBounds(erased[0], 800, 800).y, 20);
  assert.equal(eraserMaskBounds(erased[0], 800, 800).width, 10);
  assert.equal(eraseShapes(shapes, { d: 'M 500 500', strokeWidth: 2 }, new Set()), shapes);
});

test('eraser picks up fast crossing segments, brush radius and missing bounds conservatively', () => {
  const shapes = [shape({ id: 'crossed' }), shape({ id: 'edge' }), shape({ id: 'unknown' })];
  const bounds = new Map([
    ['crossed', { x: 45, y: 45, width: 10, height: 10 }],
    ['edge', { x: 45, y: 56, width: 10, height: 5 }],
  ]);
  const targets = eraserTargets(shapes, bounds, [{ x: 0, y: 50 }, { x: 100, y: 50 }], 14);
  assert.equal(targets.size, 3);
});

test('repeated erasing compacts equal-width mask paths without changing undo snapshots', () => {
  const once = eraseShapes([shape()], { d: 'M 10 10 L 20 10', strokeWidth: 12 });
  const twice = eraseShapes(once, { d: 'M 40 40 L 50 40', strokeWidth: 12 });
  assert.equal(once[0].erasures[0].d, 'M 10 10 L 20 10');
  assert.equal(twice[0].erasures.length, 1);
  assert.equal(twice[0].erasures[0].d, 'M 10 10 L 20 10 M 40 40 L 50 40');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/tools/utils/rasterImageImport.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, require: () => ({ loadImageTracer: () => { throw new Error('Invalid files must not load the tracer'); } }) });

test('image fits square board without cropping or stretching', () => {
  for (const [iw, ih, expected] of [
    [160, 80, { x: 0, y: 200, width: 800, height: 400 }],
    [80, 160, { x: 200, y: 0, width: 400, height: 800 }],
    [100, 100, { x: 0, y: 0, width: 800, height: 800 }],
  ]) {
    assert.deepEqual(JSON.parse(JSON.stringify(api.fitRasterImage(iw, ih, 800, 800))), expected);
  }
});

test('image fits custom non-square board', () => {
  const fit = api.fitRasterImage(300, 600, 640, 480);
  assert.equal(fit.width / fit.height, 0.5);
  assert.equal(fit.x, 200);
  assert.equal(fit.y, 0);
  assert.equal(fit.height, 480);
});

test('invalid formats and oversized files are rejected before loading the tracer', async () => {
  await assert.rejects(api.importRasterImage({ name: 'document.txt', size: 100 }, 800, 800, 32), /Hãy chọn ảnh/);
  await assert.rejects(api.importRasterImage({ name: 'photo.png', size: 21 * 1024 * 1024 }, 800, 800, 32), /20 MB/);
});

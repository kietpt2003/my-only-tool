const React = require('react'), { createRoot } = require('react-dom/client'), { MemoryRouter } = require('react-router-dom');
const Painter = require('../../src/features/tools/components/SvgPainter').default;
const api = require('../../src/features/tools/utils/svgPainter');
require('../../src/assets/styles/App.css');
Element.prototype.setPointerCapture = () => { };
Element.prototype.hasPointerCapture = () => false;
createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter, null, React.createElement(Painter)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const frame = () => sleep(20);
const check = (v, m) => { if (!v)
    throw new Error(m); };
async function run() {
    try {
        await sleep(100);
        const board = () => document.querySelector('[aria-label="Bảng vẽ SVG"]');
        const click = async (text) => { [...document.querySelectorAll('button')].find(b => b.textContent.trim().endsWith(text)).click(); await frame(); };
        const point = (type, x, y, target = board()) => { const p = new DOMPoint(x, y).matrixTransform(board().getScreenCTM()); target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: p.x, clientY: p.y })); };
        let paths = '';
        for (let y = 0; y < 40; y++)
            for (let x = 0; x < 40; x++)
                paths += '<rect x="' + (x * 20 + 2) + '" y="' + (y * 20 + 2) + '" width="14" height="14" fill="' + ((x + y) % 2 ? '#ff0000' : '#0000ff') + '"/>';
        const input = document.querySelector('[type="file"]'), dt = new DataTransfer();
        dt.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">' + paths + '</svg>'], 'large.svg', { type: 'image/svg+xml' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        for (let i = 0; i < 100; i++) {
            await sleep(50);
            if (!document.querySelector('fieldset').disabled)
                break;
        }
        check(board().querySelectorAll('[data-shape-id]').length === 1600, 'large import');
        point('pointerdown', 100, 100);
        await frame();
        for (let i = 1; i <= 12; i++) {
            point('pointermove', 100 + i * 8, 100 + Math.sin(i) * 8);
            await frame();
        }
        point('pointerup', 200, 100);
        await frame();
        await click('Cục gôm');
        let eraserMutations = 0;
        const observer = new MutationObserver(records => eraserMutations += records.length);
        observer.observe(board(), { subtree: true, childList: true, attributes: true });
        point('pointerdown', 100, 410);
        await frame();
        for (let i = 1; i <= 12; i++) {
            point('pointermove', 100 + i * 7, 410);
            await frame();
        }
        point('pointerup', 184, 410);
        await frame();
        observer.disconnect();
        const maskCount = board().querySelectorAll('mask').length;
        await click('Xem mã SVG');
        const code = () => document.querySelector('[aria-label="Mã SVG xuất ra"]').value;
        const pixels = await api.rasterizeDrawing(code(), 800, 800);
        const alpha = (x, y) => pixels.data[(y * 800 + x) * 4 + 3];
        check(alpha(130, 410) === 0, 'erase output');
        check(alpha(410, 410) === 255, 'untouched area');
        await click('↶ Hoàn tác');
        const restored = await api.rasterizeDrawing(code(), 800, 800);
        check(restored.data[(410 * 800 + 130) * 4 + 3] === 255, 'undo erase');
        await click('↷ Làm lại');
        const metrics = {};
        check(maskCount < 100, 'eraser must not mask the entire imported drawing');
        check(eraserMutations < 500, 'eraser must not rebuild all paths on pointer movement');
        metrics.maskCount = maskCount;
        metrics.eraserMutations = eraserMutations;
        metrics.shapes = 1601;
        // Native transforms and partial erasing must keep working with cached bounds.
        const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="40" height="50" fill="#ff0000"/><path fill="#0000ff" d="M 60 0 H 100 V 50 H 60 Z"/></svg>';
        const nativeFiles = new DataTransfer();
        nativeFiles.items.add(new File([source], 'native.svg', { type: 'image/svg+xml' }));
        input.files = nativeFiles.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        for (let i = 0; i < 100; i++) {
            await sleep(50);
            if (!document.querySelector('fieldset').disabled)
                break;
        }
        await click('Cục gôm');
        point('pointerdown', 600, 390);
        await frame();
        point('pointermove', 600, 410);
        await frame();
        point('pointerup', 600, 410);
        await frame();
        const cut = await api.rasterizeDrawing(code(), 800, 800);
        check(cut.data[(400 * 800 + 600) * 4 + 3] === 0, 'erase scaled native SVG');
        await click('Cọ vẽ');
        point('pointerdown', 600, 390);
        point('pointermove', 600, 410);
        point('pointerup', 600, 410);
        await frame();
        const ink = await api.rasterizeDrawing(code(), 800, 800);
        check(ink.data[(400 * 800 + 600) * 4 + 3] === 255, 'new ink is not erased by previous masks');
        await click('↶ Hoàn tác');
        await click('Chọn / di chuyển');
        const blue = [...board().querySelectorAll('[data-shape-id]')].at(-1);
        const blueId = blue.getAttribute('data-shape-id');
        point('pointerdown', 650, 450, blue);
        point('pointermove', 690, 450);
        await frame();
        point('pointerup', 690, 450);
        await frame();
        check(board().querySelector(`[data-shape-id="${blueId}"]`) === blue, 'move retains original node and stacking');
        check(blue.getAttribute('transform') === 'translate(40 0)', 'move commits final coordinates');
        const parsed = new DOMParser().parseFromString(code(), 'image/svg+xml');
        const moved = [...parsed.querySelectorAll('g')].find(g => g.getAttribute('transform') === 'translate(40 0)');
        check(moved, 'moved export group');
        for (const child of [...parsed.documentElement.children])
            if (child.localName !== 'defs' && child !== moved)
                child.remove();
        const isolated = await api.rasterizeDrawing(new XMLSerializer().serializeToString(parsed), 800, 800);
        check(isolated.data[(400 * 800 + 640) * 4 + 3] === 0, 'erased cut follows moved native shape');
        point('pointerdown', 690, 450, blue);
        point('pointermove', 730, 450);
        await frame();
        point('pointercancel', 730, 450);
        await frame();
        check(blue.getAttribute('transform') === 'translate(40 0)', 'cancel restores original position');
        const out = document.createElement('pre');
        out.id = 'result';
        out.textContent = 'PASS ' + JSON.stringify(metrics);
        document.body.replaceChildren(out);
    }
    catch (e) {
        document.body.textContent = 'FAIL ' + e.stack;
    }
}
run();

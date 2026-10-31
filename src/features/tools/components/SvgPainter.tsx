import React from 'react';
import { useNavigate } from 'react-router-dom';
import { coordinate, drawingSvg, eraseShapes, eraserTargets, filledRegion, geometryPath, Point, rasterizeDrawing, strokePath, VectorBounds, VectorShape } from '../utils/svgPainter';
import { SvgCodePreview, SvgPainterLayer } from './SvgPainterLayer';
import { importRasterImage } from '../utils/rasterImageImport';
import { importSvgImage } from '../utils/svgImageImport';

type Tool = 'brush' | 'region' | 'line' | 'rect' | 'ellipse' | 'bucket' | 'picker' | 'select' | 'eraser' | 'delete' | 'pan';
type Drawing = { shapes: VectorShape[]; background: string };
type History = { past: Drawing[]; present: Drawing; future: Drawing[] };
type Gesture = { pointerId: number; start: Point; latest: Point; points: Point[]; shape: VectorShape; moving: boolean; node?: SVGGElement | null };
const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'brush', label: 'Cọ vẽ', icon: '✎', hint: 'Kéo để vẽ nét tự do. Chạm để vẽ một chấm.' },
  { id: 'region', label: 'Vùng tự do', icon: '◩', hint: 'Vẽ đường bao; thả tay để đóng kín và tô vùng.' },
  { id: 'line', label: 'Đường thẳng', icon: '╱', hint: 'Kéo từ điểm đầu đến điểm cuối.' },
  { id: 'rect', label: 'Chữ nhật', icon: '□', hint: 'Kéo để tạo hình chữ nhật.' },
  { id: 'ellipse', label: 'Ellipse', icon: '◯', hint: 'Kéo để tạo hình ellipse.' },
  { id: 'bucket', label: 'Tô vùng kín', icon: '▨', hint: 'Chạm vào vùng kín để tô màu. Đường bao phải kín; vùng hở sẽ tô lan ra ngoài.' },
  { id: 'picker', label: 'Lấy màu', icon: '⌾', hint: 'Chạm vào bản vẽ để lấy màu hiển thị tại điểm đó.' },
  { id: 'select', label: 'Chọn / di chuyển', icon: '↖', hint: 'Chạm một đối tượng để chọn, kéo để di chuyển. Dùng bảng bên phải để chỉnh màu.' },
  { id: 'pan', label: 'Tay kéo', icon: '✋', hint: 'Kéo để di chuyển khung nhìn. Có thể giữ Space hoặc dùng nút chuột giữa với mọi công cụ.' },
  { id: 'eraser', label: 'Cục gôm', icon: '▱', hint: 'Kéo để gôm một phần bản vẽ. Gôm xuyên các nét/hình đang có, giữ nguyên nền; có thể vẽ lại lên vùng đã gôm.' },
  { id: 'delete', label: 'Xóa đối tượng', icon: '⌫', hint: 'Chạm để xóa toàn bộ nét hoặc hình vector.' },
];
const COLORS = ['#0f172a', '#ffffff', '#64748b', '#ef4444', '#f97316', '#facc15', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];
const button = 'px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
const panel = 'bg-white rounded-2xl border border-slate-200 p-4 space-y-4';

const SvgPainter: React.FC = () => {
  const navigate = useNavigate();
  const [tool, setTool] = React.useState<Tool>('brush');
  const [color, setColor] = React.useState('#0f172a');
  const [strokeWidth, setStrokeWidth] = React.useState(8);
  const [eraserSize, setEraserSize] = React.useState(24);
  const [eraserPosition, setEraserPosition] = React.useState<Point | null>(null);
  const [opacity, setOpacity] = React.useState(1);
  const [fillShapes, setFillShapes] = React.useState(false);
  const [tolerance, setTolerance] = React.useState(32);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 800 });
  const [sizeInput, setSizeInput] = React.useState({ width: '800', height: '800' });
  const [importColors, setImportColors] = React.useState(32);
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 800, height: 600 });
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const [history, setHistory] = React.useState<History>({ past: [], present: { shapes: [], background: 'none' }, future: [] });
  const [draft, setDraft] = React.useState<VectorShape | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [useCurrentColor, setUseCurrentColor] = React.useState(false);
  const [mappedColor, setMappedColor] = React.useState('#0f172a');
  const [previewColor, setPreviewColor] = React.useState('#14b8a6');
  const [fileName, setFileName] = React.useState('drawing');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [showCode, setShowCode] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const panGesture = React.useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const spaceRef = React.useRef(false);
  const zoomAnchor = React.useRef<{ x: number; y: number; documentX: number; documentY: number } | null>(null);
  const gesture = React.useRef<Gesture | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const pendingCursor = React.useRef<Point | null | undefined>(undefined);
  const boundsRef = React.useRef(new Map<string, VectorBounds>());
  const activeMaskId = `active-erase-${React.useId().replace(/:/g, '')}`;
  const busyRef = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }; }, []);
  const { shapes, background } = history.present;
  const { width, height } = dimensions;
  const fitZoom = Math.min(1, Math.max(1, viewportSize.width - 32) / width, Math.max(1, viewportSize.height - 32) / height);
  const displayZoom = zoom ?? fitZoom;
  const selected = React.useMemo(() => selectedId ? shapes.find(shape => shape.id === selectedId) : undefined, [shapes, selectedId]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight }));
    observer.observe(viewport);
    setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    return () => observer.disconnect();
  }, []);

  const changeZoom = React.useCallback((value: number | null, client?: { x: number; y: number }) => {
    const viewport = viewportRef.current, svg = svgRef.current;
    if (!viewport || !svg || gesture.current || panGesture.current || busyRef.current) return;
    const next = value === null ? fitZoom : Math.max(0.125, Math.min(8, value));
    if (Math.abs(next - displayZoom) < 0.000001) { zoomAnchor.current = null; setZoom(value === null ? null : next); return; }
    const view = viewport.getBoundingClientRect(), board = svg.getBoundingClientRect();
    const anchor = client || { x: view.left + viewport.clientWidth / 2, y: view.top + viewport.clientHeight / 2 };
    zoomAnchor.current = { ...anchor, documentX: (anchor.x - board.left) / displayZoom, documentY: (anchor.y - board.top) / displayZoom };
    setEraserPosition(null);
    setZoom(value === null ? null : next);
  }, [displayZoom, fitZoom]);

  React.useLayoutEffect(() => {
    const anchor = zoomAnchor.current, viewport = viewportRef.current, svg = svgRef.current;
    if (!anchor || !viewport || !svg) return;
    const board = svg.getBoundingClientRect();
    viewport.scrollLeft += board.left + anchor.documentX * displayZoom - anchor.x;
    viewport.scrollTop += board.top + anchor.documentY * displayZoom - anchor.y;
    zoomAnchor.current = null;
  }, [displayZoom]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom(displayZoom * Math.exp(-event.deltaY * 0.002), { x: event.clientX, y: event.clientY });
    };
    viewport?.addEventListener('wheel', wheel, { passive: false });
    return () => viewport?.removeEventListener('wheel', wheel);
  }, [changeZoom, displayZoom]);

  React.useEffect(() => {
    const release = () => { spaceRef.current = false; setSpaceHeld(false); };
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || (event.target instanceof Element && event.target.closest('button, input, textarea, select, a, [contenteditable="true"]'))) return;
      if (gesture.current || busyRef.current) return;
      event.preventDefault(); spaceRef.current = true; setSpaceHeld(true);
    };
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') release(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', release);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', release); };
  }, []);

  const commit = React.useCallback((update: (drawing: Drawing) => Drawing) => {
    setHistory(previous => ({ past: [...previous.past.slice(-79), previous.present], present: update(previous.present), future: [] }));
  }, []);
  const undo = React.useCallback(() => {
    setSelectedId(null);
    setHistory(previous => previous.past.length ? {
      past: previous.past.slice(0, -1), present: previous.past[previous.past.length - 1], future: [previous.present, ...previous.future],
    } : previous);
  }, []);
  const redo = React.useCallback(() => {
    setSelectedId(null);
    setHistory(previous => previous.future.length ? {
      past: [...previous.past, previous.present], present: previous.future[0], future: previous.future.slice(1),
    } : previous);
  }, []);
  const deleteSelected = React.useCallback(() => {
    if (!selectedId) return;
    commit(drawing => ({ ...drawing, shapes: drawing.shapes.filter(shape => shape.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, commit]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
      if (busyRef.current || gesture.current) return;
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        if (event.key.toLowerCase() === 'y' || event.shiftKey) redo(); else undo();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault(); deleteSelected();
      } else if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, deleteSelected]);

  const palette = React.useMemo(() => Array.from(new Set([
    ...(background === 'none' ? [] : [background]),
    ...shapes.flatMap(shape => [shape.fill, shape.stroke].filter(value => value !== 'none')),
  ])).sort(), [shapes, background]);
  const exportSvg = React.useMemo(() => showCode ? drawingSvg(shapes, width, height, background, useCurrentColor ? mappedColor : undefined) : '', [showCode, shapes, width, height, background, useCurrentColor, mappedColor]);
  const getExportSvg = () => exportSvg || drawingSvg(shapes, width, height, background, useCurrentColor ? mappedColor : undefined);
  const onBounds = React.useCallback((id: string, bounds: VectorBounds | null) => {
    if (bounds) boundsRef.current.set(id, bounds); else boundsRef.current.delete(id);
  }, []);
  const paint = (value: string) => useCurrentColor && value === mappedColor ? 'currentColor' : value;

  const pointAt = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const matrix = svgRef.current?.getScreenCTM()?.inverse();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: coordinate(Math.max(0, Math.min(width, point.x))), y: coordinate(Math.max(0, Math.min(height, point.y))) };
  };
  const makeShape = (): VectorShape => ({
    id: crypto.randomUUID(), d: '', fill: (tool === 'region' || (fillShapes && ['rect', 'ellipse'].includes(tool))) ? color : 'none',
    stroke: tool === 'region' ? 'none' : color, strokeWidth: tool === 'eraser' ? eraserSize : strokeWidth, opacity, x: 0, y: 0,
  });

  const sampleRegion = async (point: Point) => {
    busyRef.current = true; setBusy(true); setMessage('Đang đọc vùng màu…');
    try {
      const scale = tool === 'bucket' ? 2 : 1;
      const pixels = await rasterizeDrawing(getExportSvg(), width * scale, height * scale, previewColor);
      if (!mounted.current) return;
      if (tool === 'picker') {
        const offset = (Math.min(height - 1, Math.floor(point.y)) * width + Math.min(width - 1, Math.floor(point.x))) * 4;
        if (!pixels.data[offset + 3]) { setMessage('Vùng này trong suốt. Hãy chọn một nét hoặc hình có màu.'); return; }
        setColor('#' + Array.from(pixels.data.slice(offset, offset + 3)).map(value => value.toString(16).padStart(2, '0')).join(''));
        setMessage('Đã lấy màu từ bản vẽ.');
      } else {
        const region = filledRegion(pixels, { x: point.x * scale, y: point.y * scale }, color, tolerance, scale);
        if (!region.d) { setMessage('Không tìm thấy vùng để tô.'); return; }
        const shape: VectorShape = { ...makeShape(), ...region };
        commit(drawing => ({ ...drawing, shapes: [...drawing.shapes, shape] }));
        setMessage('Đã tô vùng bằng SVG path.');
      }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Không thể tô vùng.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || busyRef.current || gesture.current) return;
    const point = pointAt(event);
    const id = (event.target as Element).closest('[data-shape-id]')?.getAttribute('data-shape-id');
    if (tool === 'bucket' || tool === 'picker') { void sampleRegion(point); return; }
    if (tool === 'delete') {
      if (id) commit(drawing => ({ ...drawing, shapes: drawing.shapes.filter(shape => shape.id !== id) }));
      setSelectedId(null); return;
    }
    if (tool === 'eraser' && !shapes.length) return;
    setSelectedId(tool === 'select' ? id || null : null);
    const shape = tool === 'select' ? shapes.find(item => item.id === id) : makeShape();
    if (!shape) return;
    gesture.current = { pointerId: event.pointerId, start: point, latest: point, points: [point], shape, moving: tool === 'select', node: tool === 'select' ? svgRef.current?.querySelector<SVGGElement>(`[data-shape-id="${shape.id}"]`) : undefined };
    if (tool !== 'select') setDraft({ ...shape, d: strokePath([point], tool === 'region') });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const gestureShape = (active: Gesture): VectorShape => {
    const point = active.latest;
    if (active.moving) {
      return { ...active.shape, x: active.shape.x + point.x - active.start.x, y: active.shape.y + point.y - active.start.y };
    }
    return { ...active.shape, d: ['brush', 'region', 'eraser'].includes(tool) ? strokePath(active.points, tool === 'region') : geometryPath(tool, active.start, point) };
  };
  const queueFrame = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingCursor.current !== undefined) { setEraserPosition(pendingCursor.current); pendingCursor.current = undefined; }
      const active = gesture.current;
      if (active) {
        const next = gestureShape(active);
        // Keep the original stacking position while moving, without rebuilding
        // thousands of unchanged paths on every pointer event.
        if (active.moving) active.node?.setAttribute('transform', `translate(${next.x} ${next.y})`);
        setDraft(next);
      }
    });
  };
  const updateGesture = (event: React.PointerEvent<SVGSVGElement>, immediate = false, point = pointAt(event)) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return null;
    active.latest = point;
    const last = active.points[active.points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) >= 0.75) active.points.push(point);
    if (immediate) return gestureShape(active);
    queueFrame();
    return null;
  };
  const pointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = updateGesture(event, true);
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    pendingCursor.current = undefined;
    if (tool === 'eraser') setEraserPosition(active.latest);
    if (active.moving && next) active.node?.setAttribute('transform', `translate(${next.x} ${next.y})`);
    if (next?.d && (!active.moving || next.x !== active.shape.x || next.y !== active.shape.y)) {
      const targets = tool === 'eraser' ? eraserTargets(shapes, boundsRef.current, active.points, next.strokeWidth) : undefined;
      const bounds = tool === 'eraser' ? new Map(boundsRef.current) : undefined;
      if (!targets || targets.size) commit(drawing => ({ ...drawing, shapes: tool === 'eraser' ? eraseShapes(drawing.shapes, next, targets, bounds) : active.moving ? drawing.shapes.map(shape => shape.id === next.id ? next : shape) : [...drawing.shapes, next] }));
    }
    gesture.current = null; setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancelGesture = () => {
    const active = gesture.current;
    if (active?.moving) active.node?.setAttribute('transform', `translate(${active.shape.x} ${active.shape.y})`);
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    pendingCursor.current = undefined; gesture.current = null; setDraft(null);
  };
  const updateSelected = (values: Partial<VectorShape>) => {
    commit(drawing => ({ ...drawing, shapes: drawing.shapes.map(shape => shape.id === selectedId ? { ...shape, ...values, maskBounds: undefined } : shape) }));
  };
  const reorderSelected = (front: boolean) => {
    if (!selected) return;
    commit(drawing => {
      const rest = drawing.shapes.filter(shape => shape.id !== selected.id);
      return { ...drawing, shapes: front ? [...rest, selected] : [selected, ...rest] };
    });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([getExportSvg()], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${fileName.trim().replace(/\.svg$/i, '').replace(/[<>:"/\\|?*]/g, '-') || 'drawing'}.svg`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Đã xuất file SVG vector.');
  };

  const importImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busyRef.current || gesture.current) return;
    busyRef.current = true; setBusy(true); setMessage('Đang chuyển ảnh thành vector…');
    try {
      const isSvg = /\.svg$/i.test(file.name) || file.type === 'image/svg+xml';
      const result = isSvg ? await importSvgImage(file, width, height, importColors) : { shapes: await importRasterImage(file, width, height, importColors), retraced: true };
      const imported = result.shapes;
      if (!mounted.current) return;
      commit(drawing => ({ ...drawing, shapes: [...drawing.shapes, ...imported] }));
      if (!shapes.length && fileName === 'drawing') setFileName(file.name.replace(/\.[^.]+$/, ''));
      setSelectedId(null); setTool('brush');
      setMessage(`Đã nhập ${imported.length} vùng vector${isSvg ? result.retraced ? ' (SVG có hiệu ứng/ảnh nhúng đã được chuyển lại thành đường vector)' : ' (giữ đường nét SVG gốc)' : ''}. Bạn có thể vẽ thêm, tô màu hoặc gôm; hoàn tác sẽ bỏ lần nhập này.`);
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : 'Không thể chuyển ảnh thành vector.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-4 text-slate-800">
      <header className={`${panel} flex flex-wrap items-center justify-between gap-4 !space-y-0`}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className={button} aria-label="Về Dashboard">←</button>
          <div><h1 className="text-xl font-bold">SVG Painter</h1><p className="text-xs text-slate-500 mt-1">Vẽ vector · Tô vùng kín · Xuất SVG với currentColor</p></div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className={button} onClick={() => imageInputRef.current?.click()} disabled={busy}>↑ Nhập ảnh / SVG</button>
          <button type="button" className={button} onClick={undo} disabled={!history.past.length || busy}>↶ Hoàn tác</button>
          <button type="button" className={button} onClick={redo} disabled={!history.future.length || busy}>↷ Làm lại</button>
          <button type="button" className={button} disabled={!shapes.length || busy} onClick={() => { if (window.confirm('Xóa toàn bộ bản vẽ? Bạn có thể hoàn tác sau đó.')) { commit(drawing => ({ ...drawing, shapes: [] })); setSelectedId(null); } }}>Xóa bản vẽ</button>
          <button type="button" className={`${button} !bg-teal-600 !text-white !border-teal-600`} onClick={download} disabled={busy}>↓ Xuất SVG</button>
        </div>
      </header>
      <input ref={imageInputRef} type="file" aria-label="Nhập ảnh để chuyển vector" accept=".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif" onChange={importImage} disabled={busy} className="hidden" />

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_260px] gap-4 items-start">
        <fieldset className={`${panel} min-w-0`} disabled={busy}>
          <legend className="sr-only">Công cụ vẽ</legend>
          <h2 className="font-semibold text-sm">Công cụ</h2>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-1.5">
            {TOOLS.map(item => <button type="button" key={item.id} aria-pressed={tool === item.id} title={item.hint} onClick={() => { setTool(item.id); setSelectedId(null); }} className={`${button} text-left flex items-center gap-2 ${tool === item.id ? '!border-teal-500 !bg-teal-50 !text-teal-800' : ''}`}><span className="text-lg w-6 text-center" aria-hidden="true">{item.icon}</span>{item.label}</button>)}
          </div>
          <label className="block text-xs font-medium">Màu đang vẽ
            <div className="flex gap-2 mt-2 items-center"><input aria-label="Màu đang vẽ" type="color" value={color} onChange={event => setColor(event.target.value)} className="w-12 h-9 cursor-pointer" /><span className="font-mono">{color}</span></div>
          </label>
          <div className="grid grid-cols-6 gap-1.5">{COLORS.map(value => <button key={value} type="button" aria-label={`Chọn màu ${value}`} title={value} onClick={() => setColor(value)} style={{ background: value }} className={`h-6 rounded border ${color === value ? 'ring-2 ring-teal-500 ring-offset-1' : 'border-slate-300'}`} />)}</div>
          <label className="block text-xs font-medium">Độ dày cọ: {strokeWidth}px<input aria-label="Độ dày cọ" type="range" min="1" max="100" value={strokeWidth} onChange={event => setStrokeWidth(Number(event.target.value))} className="block w-full accent-teal-600 mt-2" /></label>
          {tool === 'eraser' && <label className="block text-xs font-medium">Kích thước gôm: {eraserSize}px<input aria-label="Kích thước gôm" type="range" min="1" max="160" value={eraserSize} onChange={event => setEraserSize(Number(event.target.value))} className="block w-full accent-teal-600 mt-2" /><span className="text-slate-500 font-normal">Gôm xóa hoàn toàn vùng đi qua, không phụ thuộc màu hay độ đậm của cọ.</span></label>}
          <label className="block text-xs font-medium">Độ đậm: {Math.round(opacity * 100)}%<input aria-label="Độ đậm" type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={event => setOpacity(Number(event.target.value))} className="block w-full accent-teal-600 mt-2" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fillShapes} onChange={event => setFillShapes(event.target.checked)} />Tô màu chữ nhật / ellipse</label>
          {tool === 'bucket' && <label className="block text-xs font-medium">Dung sai màu: {tolerance}<input aria-label="Dung sai màu" type="range" min="0" max="120" value={tolerance} onChange={event => setTolerance(Number(event.target.value))} className="block w-full accent-teal-600 mt-2" /><span className="text-slate-500 font-normal">Tự bù mép tô để tránh chấm trắng. Giảm dung sai nếu màu bị lan; đặt 0 để so màu chính xác và tắt bù mép.</span></label>}
        </fieldset>

        <main className="min-w-0 space-y-3">
          <div className={`${panel} !p-3 !space-y-0 flex flex-wrap justify-between gap-2 text-xs`}><span>{TOOLS.find(item => item.id === tool)?.hint}</span><span className="text-slate-500">{width} × {height} · {shapes.length} đối tượng</span></div>
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 border border-slate-200 rounded-xl">
            <button type="button" className={button} aria-label="Thu nhỏ" disabled={busy || displayZoom <= 0.125} onClick={() => changeZoom(displayZoom / 1.25)}>−</button>
            <label className="text-xs flex items-center gap-2">Zoom <output className="w-10 text-right">{Math.round(displayZoom * 100)}%</output><input type="range" aria-label="Mức zoom" min="12.5" max="800" step="12.5" value={displayZoom * 100} disabled={busy} onChange={event => changeZoom(Number(event.target.value) / 100)} className="w-28 accent-teal-600" /></label>
            <button type="button" className={button} aria-label="Phóng to" disabled={busy || displayZoom >= 8} onClick={() => changeZoom(displayZoom * 1.25)}>+</button>
            <button type="button" className={button} disabled={busy} onClick={() => changeZoom(1)}>100%</button>
            <button type="button" className={button} disabled={busy} onClick={() => changeZoom(null)}>Vừa khung</button>
          </div>
          <div ref={viewportRef} aria-label="Khung nhìn bảng vẽ" className="overflow-auto rounded-xl border border-slate-300 bg-slate-100" style={{ height: 'min(70vh, 800px)', minHeight: 320, cursor: panning ? 'grabbing' : tool === 'pan' || spaceHeld ? 'grab' : undefined }}
            onPointerDownCapture={event => {
              if (!(tool === 'pan' || spaceRef.current || event.button === 1) || busyRef.current || gesture.current || panGesture.current) return;
              if (event.button !== 0 && event.button !== 1) return;
              event.preventDefault(); event.stopPropagation();
              panGesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
              setPanning(true); setEraserPosition(null); event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMoveCapture={event => {
              const active = panGesture.current;
              if (!active || active.pointerId !== event.pointerId) return;
              event.preventDefault(); event.stopPropagation();
              event.currentTarget.scrollLeft = active.left - event.clientX + active.x;
              event.currentTarget.scrollTop = active.top - event.clientY + active.y;
            }}
            onPointerUpCapture={event => {
              if (panGesture.current?.pointerId !== event.pointerId) return;
              event.stopPropagation(); panGesture.current = null; setPanning(false);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancelCapture={() => { panGesture.current = null; setPanning(false); }}
            onLostPointerCapture={event => { if (event.target === event.currentTarget) { panGesture.current = null; setPanning(false); } }}>
            <div style={{ width: Math.max(viewportSize.width, width * displayZoom + 32), height: Math.max(viewportSize.height, height * displayZoom + 32), padding: 16, boxSizing: 'border-box', display: 'grid', placeItems: 'center' }}>
            <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-label="Bảng vẽ SVG" role="img"
              className="block max-w-none shadow-md touch-none select-none"
              style={{ width: width * displayZoom, height: height * displayZoom, color: previewColor, cursor: busy ? 'wait' : panning ? 'grabbing' : tool === 'pan' || spaceHeld ? 'grab' : tool === 'eraser' ? 'none' : tool === 'select' ? 'move' : 'crosshair', backgroundColor: '#fff', backgroundImage: 'conic-gradient(#e2e8f0 25%, #fff 0 50%, #e2e8f0 0 75%, #fff 0)', backgroundSize: '20px 20px' }}
              onPointerDown={pointerDown} onPointerMove={event => {
                if (tool !== 'eraser' && !gesture.current) return;
                const point = pointAt(event);
                if (tool === 'eraser') { pendingCursor.current = point; queueFrame(); }
                updateGesture(event, false, point);
              }} onPointerLeave={() => { pendingCursor.current = null; queueFrame(); }} onPointerUp={pointerUp} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}>
              {draft && tool === 'eraser' && <defs><mask id={activeMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: 'luminance' }}>
                <rect width={width} height={height} fill="#ffffff" />
                <path d={draft.d} fill="none" stroke="#000000" strokeWidth={draft.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
              </mask></defs>}
              {background !== 'none' && <rect width={width} height={height} fill={paint(background)} />}
              <g mask={draft && tool === 'eraser' ? `url(#${activeMaskId})` : undefined}>
                <SvgPainterLayer shapes={shapes} width={width} height={height} mappedColor={useCurrentColor ? mappedColor : undefined} onBounds={onBounds} />
              </g>
              {draft && tool !== 'eraser' && !gesture.current?.moving && <g pointerEvents="none" transform={`translate(${draft.x} ${draft.y})`}><path d={draft.d} fill={paint(draft.fill)} stroke={paint(draft.stroke)} strokeWidth={draft.strokeWidth} strokeLinecap={draft.strokeLinecap || 'round'} strokeLinejoin={draft.strokeLinejoin || 'round'} fillRule={draft.fillRule || 'evenodd'} opacity={draft.opacity} transform={draft.transform} /></g>}
              {selected && <g pointerEvents="none" transform={`translate(${draft?.id === selected.id ? draft.x : selected.x} ${draft?.id === selected.id ? draft.y : selected.y})`} mask={selected.erasures?.length ? `url(#erase-${selected.id})` : undefined}><path d={selected.d} transform={selected.transform} fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /></g>}
              {tool === 'eraser' && eraserPosition && <g pointerEvents="none" fill="none"><circle cx={eraserPosition.x} cy={eraserPosition.y} r={eraserSize / 2} stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" /><circle cx={eraserPosition.x} cy={eraserPosition.y} r={eraserSize / 2} stroke="#0f172a" strokeWidth="1" vectorEffect="non-scaling-stroke" /></g>}
            </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500">Ctrl/⌘ + lăn chuột: zoom tại con trỏ · Giữ Space / chuột giữa / Tay kéo: di chuyển khung nhìn. Zoom không đổi kích thước SVG xuất. Ctrl/⌘ Z: hoàn tác · Ctrl/⌘ Shift Z: làm lại · Delete: xóa đối tượng đã chọn. Hãy xuất SVG trước khi rời trang.</p>
          <p role="status" aria-live="polite" className="text-sm text-teal-700 min-h-5">{message}</p>
        </main>

        <fieldset className="min-w-0 space-y-4" disabled={busy}>
          <legend className="sr-only">Thuộc tính và xuất SVG</legend>
          <section className={panel}>
            <h2 className="font-semibold text-sm">Nhập ảnh / SVG để vẽ tiếp</h2>
            <label className="block text-xs">Số màu vector<select aria-label="Số màu khi nhập ảnh" value={importColors} onChange={event => setImportColors(Number(event.target.value))} className="block border rounded-lg p-2 w-full mt-1">{[16, 32, 64].map(value => <option key={value} value={value}>{value} màu{value === 16 ? ' · đơn giản' : value === 64 ? ' · nhiều chi tiết' : ' · cân bằng'}</option>)}</select></label>
            <button type="button" className={`${button} w-full`} onClick={() => imageInputRef.current?.click()}>{busy ? 'Đang xử lý…' : 'Nhập ảnh → vector'}</button>
            <p className="text-xs text-slate-500">Ảnh được xử lý trong trình duyệt, chuyển thành vector và đặt vừa khổ vẽ, giữ tỉ lệ. Nét đang vẽ được giữ lại. Ảnh chụp có thể giản lược chi tiết.</p>
            <p className="text-xs text-slate-500">SVG, PNG, JPG, WebP, GIF, BMP, AVIF · tối đa 20 MB. SVG cơ bản giữ đường nét gốc; SVG có hiệu ứng hoặc ảnh nhúng được chuyển lại thành vector. Ảnh động dùng một khung hình tĩnh.</p>
          </section>
          <section className={panel}>
            <h2 className="font-semibold text-sm">Khổ vẽ & nền</h2>
            <div className="flex gap-2">{(['width', 'height'] as const).map(key => <label key={key} className="text-xs min-w-0 flex-1">{key === 'width' ? 'Rộng' : 'Cao'}<input aria-label={key === 'width' ? 'Chiều rộng' : 'Chiều cao'} type="number" min="32" max="1024" value={sizeInput[key]} onChange={event => setSizeInput(previous => ({ ...previous, [key]: event.target.value }))} className="border rounded-lg px-2 py-2 w-full mt-1" /></label>)}</div>
            <button type="button" className={`${button} w-full`} onClick={() => {
              const next = { width: Number(sizeInput.width), height: Number(sizeInput.height) };
              if (Object.values(next).some(value => !Number.isInteger(value) || value < 32 || value > 1024)) { setMessage('Kích thước phải là số nguyên từ 32 đến 1024px.'); return; }
              setDimensions(next); setMessage('Đã đổi khổ vẽ, giữ nguyên kích thước các nét.');
            }}>Áp dụng khổ vẽ</button>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={background === 'none'} onChange={event => { const value = event.target.checked ? 'none' : color; commit(drawing => ({ ...drawing, background: value })); }} />Nền trong suốt</label>
            {background !== 'none' && <label className="flex items-center justify-between text-xs">Màu nền<input aria-label="Màu nền" type="color" value={background} onChange={event => { const value = event.target.value; commit(drawing => ({ ...drawing, background: value })); }} /></label>}
          </section>

          {selected && <section className={panel}>
            <h2 className="font-semibold text-sm">Đối tượng đã chọn</h2>
            <p className="text-xs text-slate-500">Dùng màu, độ dày và độ đậm ở bảng công cụ để áp dụng.</p>
            <div className="grid grid-cols-2 gap-2"><button type="button" className={button} onClick={() => updateSelected({ fill: color })}>Tô màu</button><button type="button" className={button} onClick={() => updateSelected({ fill: 'none' })}>Bỏ màu tô</button><button type="button" className={button} onClick={() => updateSelected({ stroke: color, strokeWidth })}>Đổi viền</button><button type="button" className={button} onClick={() => updateSelected({ stroke: 'none' })}>Bỏ viền</button></div>
            <button type="button" className={`${button} w-full`} onClick={() => updateSelected({ opacity })}>Áp dụng độ đậm {Math.round(opacity * 100)}%</button>
            <div className="flex gap-2"><button type="button" className={button} onClick={() => reorderSelected(true)}>Lên trước</button><button type="button" className={button} onClick={() => reorderSelected(false)}>Ra sau</button><button type="button" className={`${button} text-rose-600`} onClick={deleteSelected}>Xóa</button></div>
          </section>}

          <section className={panel}>
            <h2 className="font-semibold text-sm">currentColor</h2>
            <label className="flex gap-2 items-center text-xs"><input type="checkbox" checked={useCurrentColor} onChange={event => { setUseCurrentColor(event.target.checked); if (!palette.includes(mappedColor)) setMappedColor(palette.length ? palette[0] : color); }} />Thay một màu bằng currentColor</label>
            {useCurrentColor && <>
              <label className="block text-xs">Màu thay thế<select aria-label="Màu thay thế bằng currentColor" value={mappedColor} onChange={event => setMappedColor(event.target.value)} className="block border rounded-lg p-2 w-full mt-1">{Array.from(new Set([mappedColor, ...palette])).map(value => <option key={value} value={value}>{value}{palette.includes(value) ? '' : ' (chưa sử dụng)'}</option>)}</select></label>
              <label className="flex items-center justify-between text-xs">Định sẵn màu nguồn<input aria-label="Màu nguồn currentColor" type="color" value={mappedColor} onChange={event => setMappedColor(event.target.value)} /></label>
              <label className="flex items-center justify-between text-xs">Màu xem thử<input aria-label="Màu xem thử currentColor" type="color" value={previewColor} onChange={event => setPreviewColor(event.target.value)} /></label>
              <p className="text-xs text-slate-500">Mọi màu tô và viền trùng mã màu đã chọn sẽ thành currentColor. Các màu khác và độ đậm được giữ nguyên. Màu xem thử không ghi vào file.</p>
            </>}
          </section>
          <section className={panel}>
            <h2 className="font-semibold text-sm">Xuất vector</h2>
            <label className="block text-xs">Tên file<input aria-label="Tên file SVG" value={fileName} onChange={event => setFileName(event.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label>
            <button type="button" className={`${button} w-full !bg-teal-600 !text-white`} onClick={download}>Tải xuống .svg</button>
            <button type="button" className={`${button} w-full`} onClick={async () => { try { await navigator.clipboard.writeText(getExportSvg()); setMessage('Đã copy SVG.'); } catch { setShowCode(true); setMessage('Không thể truy cập clipboard. Bạn có thể copy từ ô mã SVG.'); } }}>Copy SVG</button>
            <button type="button" className={`${button} w-full`} aria-expanded={showCode} onClick={() => setShowCode(value => !value)}>{showCode ? 'Ẩn mã SVG' : 'Xem mã SVG'}</button>
            <p className="text-xs text-slate-500">Xuất vector, không nhúng ảnh. Phần gôm dùng SVG mask bằng path. Mỗi thẻ trên một dòng.</p>
          </section>
        </fieldset>
      </div>
      {showCode && <SvgCodePreview code={exportSvg} />}
    </div>
  );
};

export default SvgPainter;

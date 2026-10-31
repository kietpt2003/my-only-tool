import React from 'react';
import { eraserMaskBounds, VectorBounds, VectorShape } from '../utils/svgPainter';

type ShapeProps = {
  shape: VectorShape;
  width: number;
  height: number;
  mappedColor?: string;
  onBounds: (id: string, bounds: VectorBounds | null) => void;
};

const PaintedShape = React.memo(function PaintedShape({ shape, width, height, mappedColor, onBounds }: ShapeProps) {
  const groupRef = React.useRef<SVGGElement>(null);
  const paint = (color: string) => color === mappedColor ? 'currentColor' : color;
  React.useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const box = group.getBBox();
    const matrix = shape.transform?.match(/^matrix\(([^)]+)\)$/)?.[1].trim().split(/[\s,]+/).map(Number);
    const scale = matrix?.length === 6 ? Math.hypot(matrix[0], matrix[1]) + Math.hypot(matrix[2], matrix[3]) : 2;
    const pad = shape.stroke === 'none' ? 1 : shape.strokeWidth * Math.max(1, scale) * 4 + 1;
    onBounds(shape.id, { x: box.x + shape.x - pad, y: box.y + shape.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 });
    return () => onBounds(shape.id, null);
  }, [shape.id, shape.d, shape.x, shape.y, shape.transform, shape.stroke, shape.strokeWidth, onBounds]);

  const mask = eraserMaskBounds(shape, width, height);
  return <>
    {shape.erasures?.length ? <defs><mask id={`erase-${shape.id}`} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" {...mask} style={{ maskType: 'luminance' }}>
      <rect {...mask} fill="#ffffff" />
      {shape.erasures.map((erasure, index) => <path key={index} d={erasure.d} fill="none" stroke="#000000" strokeWidth={erasure.strokeWidth} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${erasure.x} ${erasure.y})`} />)}
    </mask></defs> : null}
    <g ref={groupRef} data-shape-id={shape.id} transform={`translate(${shape.x} ${shape.y})`} mask={shape.erasures?.length ? `url(#erase-${shape.id})` : undefined}>
      <path d={shape.d} fill={paint(shape.fill)} stroke={paint(shape.stroke)} strokeWidth={shape.strokeWidth} strokeLinecap={shape.strokeLinecap || 'round'} strokeLinejoin={shape.strokeLinejoin || 'round'} fillRule={shape.fillRule || 'evenodd'} opacity={shape.opacity} transform={shape.transform} />
    </g>
  </>;
});

export const SvgPainterLayer = React.memo(function SvgPainterLayer({ shapes, width, height, mappedColor, onBounds }: {
  shapes: VectorShape[];
  width: number;
  height: number;
  mappedColor?: string;
  onBounds: ShapeProps['onBounds'];
}) {
  return <>{shapes.map(shape => <PaintedShape key={shape.id} shape={shape} width={width} height={height} mappedColor={mappedColor} onBounds={onBounds} />)}</>;
});

export const SvgCodePreview = React.memo(function SvgCodePreview({ code }: { code: string }) {
  return <label className="block text-sm font-medium">Mã SVG xuất ra<textarea aria-label="Mã SVG xuất ra" readOnly value={code} spellCheck={false} className="block w-full min-h-64 border border-slate-200 rounded-xl p-4 mt-2 bg-white font-mono text-xs" /></label>;
});

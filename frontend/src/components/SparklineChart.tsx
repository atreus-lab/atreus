"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

interface SparklineChartProps {
  data: number[];
  positive: boolean;
  onHoverIndexChange?: (index: number | null) => void;
  renderTooltip?: (index: number) => React.ReactNode;
}

export function SparklineChart({
  data,
  positive,
  onHoverIndexChange,
  renderTooltip,
}: SparklineChartProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setWidth(rect.width);
    setHeight(rect.height);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => {
    if (data.length < 2 || width === 0 || height === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    return data.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * (height - 8) - 4,
    }));
  }, [data, width, height]);

  const path = useMemo(() => {
    if (!points.length) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join("");
  }, [points]);

  const areaPath = useMemo(() => {
    if (!path || !points.length) return "";
    const lastX = points[points.length - 1].x;
    return `${path}L${lastX.toFixed(1)},${height}L0,${height}Z`;
  }, [path, points, height]);

  const color = positive ? "#22c55e" : "#f87171";
  const hoverPoint = hoverIdx !== null ? points[hoverIdx] : null;

  const updateHover = (clientX: number, rectLeft: number) => {
    if (!points.length) return;
    const stepX = width / (data.length - 1);
    const idx = Math.min(data.length - 1, Math.max(0, Math.round((clientX - rectLeft) / stepX)));
    setHoverIdx(idx);
    onHoverIndexChange?.(idx);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    updateHover(e.clientX, rect.left);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
    onHoverIndexChange?.(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {width > 0 && height > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {hoverPoint && (
            <>
              <line
                x1={hoverPoint.x}
                y1={0}
                x2={hoverPoint.x}
                y2={height}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r={4} fill={color} stroke="rgba(10,10,10,0.9)" strokeWidth="2" />
            </>
          )}
        </svg>
      )}
      {hoverPoint && hoverIdx !== null && renderTooltip && (
        <div
          className="absolute z-10 -translate-x-1/2 pointer-events-none"
          style={{ left: hoverPoint.x, top: Math.max(0, hoverPoint.y - 44) }}
        >
          {renderTooltip(hoverIdx)}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: (number | null)[];
  /** Stroke width in viewBox units (default 2). */
  width?: number;
  /** Render a soft area fill under the line. */
  fill?: boolean;
  /** Dashed stroke (used for context/reference lines). */
  dashed?: boolean;
}

interface LineChartProps {
  dates: string[];
  series: Series[];
  /** Formats a y value for the tooltip and axis ticks. */
  format: (v: number) => string;
  /** Logical viewBox size; the SVG scales responsively to its container. */
  height?: number;
  /** If set, the y-axis starts at this value instead of the data min. */
  yFloor?: number;
}

const VB_W = 760;
const M = { top: 14, right: 16, bottom: 26, left: 58 };

export default function LineChart({
  dates,
  series,
  format,
  height = 320,
  yFloor,
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const plot = {
    x0: M.left,
    x1: VB_W - M.right,
    y0: M.top,
    y1: height - M.bottom,
  };
  const plotW = plot.x1 - plot.x0;
  const plotH = plot.y1 - plot.y0;

  const { yMin, yMax, ticks } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const s of series) {
      for (const v of s.values) {
        if (v === null || !Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!Number.isFinite(lo)) {
      lo = 0;
      hi = 1;
    }
    if (yFloor !== undefined) lo = Math.min(lo, yFloor);
    if (lo === hi) {
      hi = lo + 1;
      lo -= 1;
    }
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;
    const nice = niceTicks(lo, hi, 5);
    return { yMin: nice[0], yMax: nice[nice.length - 1], ticks: nice };
  }, [series, yFloor]);

  const n = dates.length;
  const xAt = (i: number) => plot.x0 + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => plot.y1 - ((v - yMin) / (yMax - yMin)) * plotH;

  const paths = useMemo(
    () =>
      series.map((s) => {
        let d = "";
        let started = false;
        s.values.forEach((v, i) => {
          if (v === null || !Number.isFinite(v)) {
            started = false;
            return;
          }
          const cmd = started ? "L" : "M";
          d += `${cmd}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)} `;
          started = true;
        });
        let area = "";
        if (s.fill) {
          // Build a closed area under the first contiguous run of points.
          const pts = s.values
            .map((v, i) => (v !== null && Number.isFinite(v) ? { i, v } : null))
            .filter(Boolean) as { i: number; v: number }[];
          if (pts.length > 1) {
            area = `M${xAt(pts[0].i).toFixed(2)},${yAt(pts[0].v).toFixed(2)} `;
            for (const p of pts) area += `L${xAt(p.i).toFixed(2)},${yAt(p.v).toFixed(2)} `;
            area += `L${xAt(pts[pts.length - 1].i).toFixed(2)},${plot.y1.toFixed(2)} `;
            area += `L${xAt(pts[0].i).toFixed(2)},${plot.y1.toFixed(2)} Z`;
          }
        }
        return { d: d.trim(), area };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, yMin, yMax, n, height],
  );

  const xTickIdx = useMemo(() => {
    const count = Math.min(6, n);
    if (count <= 1) return [0];
    return Array.from({ length: count }, (_, k) => Math.round((k / (count - 1)) * (n - 1)));
  }, [n]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * VB_W;
    const frac = (fx - plot.x0) / plotW;
    const idx = Math.round(frac * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  const tooltip =
    hover !== null
      ? {
          left: `${(xAt(hover) / VB_W) * 100}%`,
          top: `${(Math.min(...series.map((s) => yValOr(s.values[hover], yAt, plot.y1))) / height) * 100}%`,
          date: dates[hover],
          rows: series
            .map((s) => ({ name: s.name, color: s.color, v: s.values[hover] }))
            .filter((r) => r.v !== null && Number.isFinite(r.v as number)) as {
            name: string;
            color: string;
            v: number;
          }[],
        }
      : null;

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${height}`}
        role="img"
        aria-label="Time-series chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Y gridlines + labels */}
        {ticks.map((t, i) => (
          <g key={`y${i}`}>
            <line
              x1={plot.x0}
              x2={plot.x1}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="var(--grid)"
              strokeWidth={1}
            />
            <text
              x={plot.x0 - 8}
              y={yAt(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--text-muted)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(t)}
            </text>
          </g>
        ))}

        {/* X ticks (first anchored to start, last to end, to avoid edge clipping) */}
        {xTickIdx.map((i, k) => (
          <text
            key={`x${i}`}
            x={xAt(i)}
            y={height - 8}
            textAnchor={k === 0 ? "start" : k === xTickIdx.length - 1 ? "end" : "middle"}
            fontSize={11}
            fill="var(--text-muted)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {shortDate(dates[i])}
          </text>
        ))}

        {/* Baseline */}
        <line
          x1={plot.x0}
          x2={plot.x1}
          y1={plot.y1}
          y2={plot.y1}
          stroke="var(--axis)"
          strokeWidth={1}
        />

        {/* Area fills (drawn under lines) */}
        {paths.map((p, i) =>
          p.area ? (
            <path key={`a${i}`} d={p.area} fill={series[i].color} opacity={0.1} stroke="none" />
          ) : null,
        )}

        {/* Series lines */}
        {paths.map((p, i) => (
          <path
            key={`l${i}`}
            d={p.d}
            fill="none"
            stroke={series[i].color}
            strokeWidth={series[i].width ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={series[i].dashed ? "4 4" : undefined}
          />
        ))}

        {/* Hover crosshair + markers */}
        {hover !== null && (
          <g pointerEvents="none">
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={plot.y0}
              y2={plot.y1}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {series.map((s, i) => {
              const v = s.values[hover];
              if (v === null || !Number.isFinite(v)) return null;
              return (
                <circle
                  key={`m${i}`}
                  cx={xAt(hover)}
                  cy={yAt(v)}
                  r={4}
                  fill={s.color}
                  stroke="var(--surface-1)"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}
      </svg>

      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          <div className="tt-date">{tooltip.date}</div>
          {tooltip.rows.map((r) => (
            <div className="tt-row" key={r.name}>
              <span className="dot" style={{ background: r.color }} />
              <span>{r.name}</span>
              <strong style={{ marginLeft: "auto", paddingLeft: 10 }}>{format(r.v)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function yValOr(v: number | null, yAt: (v: number) => number, fallback: number): number {
  return v !== null && Number.isFinite(v) ? yAt(v) : fallback;
}

function shortDate(iso: string): string {
  // YYYY-MM-DD -> "MMM 'YY" style compact label.
  const [y, m] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const rawStep = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks.length ? ticks : [lo, hi];
}

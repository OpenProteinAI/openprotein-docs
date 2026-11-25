"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

type Kind = "solid" | "dashed" | "bold" | "gradient";
type Route = "curve" | "straight" | "lane";

/** An end of an arrow: a `data-pd` anchor and a point inside its box, as fractions. */
type End = [anchor: string, fx: number, fy: number];

type Edge = {
  from: End;
  to: End;
  /** Heading leaving `from` and arriving at `to`, in degrees: 0 right, 90 down. */
  out: number;
  in: number;
  kind: Kind;
  route?: Route;
  head?: boolean;
  /** Gap left at each end, in em of the canvas. */
  pad?: [number, number];
  /** For a lane route: the x of its vertical run and, when leaving downward, the y it turns at. */
  lane?: { x: End; y?: End };
};

const R = 0;
const D = 90;
const L = 180;
const U = 270;

const EDGES: Edge[] = [
  {
    from: ["in-settings-img", 0, 0.5],
    to: ["generate-card", 0, 0.72],
    out: L,
    in: R,
    kind: "dashed",
    route: "lane",
    lane: { x: ["design", 0.0143, 0] },
    pad: [0.375, 0.25],
  },
  {
    from: ["in-parental-img", 0.12, 1],
    to: ["generate-card", 0, 0.32],
    out: D,
    in: R,
    kind: "dashed",
    route: "lane",
    lane: { x: ["design", 0.0334, 0], y: ["in-settings", 0, 1.15] },
    pad: [0.375, 0.25],
  },
  {
    from: ["generate-img", 1, 0.4],
    to: ["predict-img", 0, 0.42],
    out: R,
    in: R,
    kind: "gradient",
    route: "straight",
    pad: [1.375, 0.3125],
  },
  {
    from: ["predict-img", 1, 0.42],
    to: ["select-img", 0, 0.42],
    out: R,
    in: R,
    kind: "gradient",
    route: "straight",
    pad: [2.4375, 1.25],
  },
  {
    from: ["chain", 0.02, 0.04],
    to: ["generate-img", 0.45, 1],
    out: L,
    in: 235,
    kind: "dashed",
    pad: [0.25, 0.25],
  },
  {
    from: ["arm", 0.91, 0.32],
    to: ["chain", 0.13, 0.6],
    out: 285,
    in: 315,
    kind: "dashed",
    pad: [0.25, 0.25],
  },
  {
    from: ["train-img", 0.05, 0.36],
    to: ["predict-card", 0.55, 1],
    out: 195,
    in: 235,
    kind: "solid",
    pad: [0.25, 0.375],
  },
  {
    from: ["train-img", 0.05, 0.64],
    to: ["chain", 0.99, 0.96],
    out: 160,
    in: L,
    kind: "solid",
    pad: [0.25, 0.25],
  },
  {
    from: ["design", 0.94, 0.1577],
    to: ["build-head", 0, 0.5],
    out: R,
    in: R,
    kind: "bold",
    route: "straight",
    pad: [0, 1.33],
  },
  {
    from: ["build", 0.88, 0.1875],
    to: ["output-head", 0, 0.5],
    out: R,
    in: R,
    kind: "bold",
    route: "straight",
    pad: [0, 1.15],
  },
  {
    from: ["lab", 0.32, 0.93],
    to: ["data", 0.24, 0.1],
    out: 115,
    in: D,
    kind: "dashed",
    pad: [0.25, 0.25],
  },
  {
    from: ["data", 0.01, 0.35],
    to: ["train-img", 0.95, 0.22],
    out: L,
    in: L,
    kind: "dashed",
    pad: [0.25, 0.375],
  },
  {
    from: ["data", 0.01, 0.53],
    to: ["train-img", 0.95, 0.5],
    out: L,
    in: L,
    kind: "dashed",
    pad: [0.25, 0.375],
  },
  {
    from: ["data", 0.01, 0.72],
    to: ["train-img", 0.95, 0.78],
    out: L,
    in: L,
    kind: "dashed",
    pad: [0.25, 0.375],
  },
];

const vec = (deg: number): [number, number] => [
  Math.cos((deg * Math.PI) / 180),
  Math.sin((deg * Math.PI) / 180),
];

type Drawn = {
  d: string;
  kind: Kind;
  head: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function point(
  root: DOMRect,
  el: Element,
  fx: number,
  fy: number,
): [number, number] {
  const r = el.getBoundingClientRect();
  return [r.left - root.left + fx * r.width, r.top - root.top + fy * r.height];
}

const f = (n: number) => Math.round(n * 10) / 10;
const pt = ([x, y]: [number, number]) => `${f(x)},${f(y)}`;

type Pt = [number, number];

/** A polyline through `pts` with each corner rounded. */
function rounded(pts: Pt[], radius: number): string {
  let d = `M${pt(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [q, p, n] = [pts[i - 1], pts[i], pts[i + 1]];
    const into = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const out = Math.hypot(n[0] - p[0], n[1] - p[1]);
    const r = Math.min(radius, into / 2, out / 2);
    if (r === 0) continue;
    const before: Pt = [
      p[0] - ((p[0] - q[0]) / into) * r,
      p[1] - ((p[1] - q[1]) / into) * r,
    ];
    const after: Pt = [
      p[0] + ((n[0] - p[0]) / out) * r,
      p[1] + ((n[1] - p[1]) / out) * r,
    ];
    d += ` L${pt(before)} Q${pt(p)} ${pt(after)}`;
  }
  return `${d} L${pt(pts[pts.length - 1])}`;
}

function path(
  e: Edge,
  a: [number, number],
  b: [number, number],
  em: number,
  via?: { x: number; y?: number },
): string {
  const [ox, oy] = vec(e.out);
  const [ix, iy] = vec(e.in);
  const route = e.route ?? "curve";

  if (route === "straight") {
    if (Math.abs(ox) < 0.5) b[0] = a[0];
    else b[1] = a[1];
    return `M${pt(a)} L${pt(b)}`;
  }
  if (route === "lane" && via) {
    const pts: Pt[] =
      Math.abs(ox) > 0.5
        ? [a, [via.x, a[1]], [via.x, b[1]], b]
        : [a, [a[0], via.y ?? a[1]], [via.x, via.y ?? a[1]], [via.x, b[1]], b];
    return rounded(pts, 0.5 * em);
  }
  const k = Math.max(1.5 * em, 0.4 * Math.hypot(b[0] - a[0], b[1] - a[1]));
  return `M${pt(a)} C${pt([a[0] + ox * k, a[1] + oy * k])} ${pt([b[0] - ix * k, b[1] - iy * k])} ${pt(b)}`;
}

/** Arrowhead lengths in em. The line stops inside the head where it is wider than the stroke. */
const HEADS = { thin: 0.6, bold: 0.8, warm: 0.8 } as const;
const INSET = 0.35;
const headOf = (kind: Kind) =>
  kind === "bold" ? "bold" : kind === "gradient" ? "warm" : "thin";

/** The anchor that is laid out: themed art renders a hidden twin under the same name. */
function find(root: HTMLElement, name: string): Element | null {
  for (const el of root.querySelectorAll(`[data-pd="${name}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width || r.height) return el;
  }
  return null;
}

function measure(root: HTMLElement, em: number): Drawn[] {
  const box = root.getBoundingClientRect();
  const drawn: Drawn[] = [];

  for (const e of EDGES) {
    const from = find(root, e.from[0]);
    const to = find(root, e.to[0]);
    if (!from || !to) continue;
    const a = point(box, from, e.from[1], e.from[2]);
    const b = point(box, to, e.to[1], e.to[2]);

    const [p0, p1] = e.pad ?? [0, 0];
    const [ox, oy] = vec(e.out);
    const [ix, iy] = vec(e.in);
    a[0] += ox * p0 * em;
    a[1] += oy * p0 * em;
    b[0] -= ix * p1 * em;
    b[1] -= iy * p1 * em;
    // Pull the line back so the head's tip, not the line's end, lands on the target.
    const back =
      (e.head ?? true) ? (1 - INSET) * HEADS[headOf(e.kind)] * em : 0;
    b[0] -= ix * back;
    b[1] -= iy * back;

    let via: { x: number; y?: number } | undefined;
    if (e.lane) {
      const lx = find(root, e.lane.x[0]);
      const ly = e.lane.y && find(root, e.lane.y[0]);
      if (lx) {
        via = { x: point(box, lx, e.lane.x[1], 0)[0] };
        if (ly && e.lane.y) via.y = point(box, ly, 0, e.lane.y[2])[1];
      }
    }

    drawn.push({
      d: path(e, a, b, em, via),
      kind: e.kind,
      head: e.head ?? true,
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
    });
  }
  return drawn;
}

/** Arrows are measured from the laid-out boxes, so they stay attached at any board size. */
export function PlatformDiagramArrows() {
  const svg = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<{
    w: number;
    h: number;
    em: number;
    edges: Drawn[];
  }>();
  const id = useId().replace(/:/g, "");

  useLayoutEffect(() => {
    const root = svg.current?.parentElement;
    if (!root) return;

    let frame = 0;
    let live = true;
    const update = () => {
      if (!live) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The canvas' font size is the board's unit, so arrows scale with it.
        const em = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
        setState({
          w: root.clientWidth,
          h: root.clientHeight,
          em,
          edges: measure(root, em),
        });
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(root);
    for (const el of root.querySelectorAll("[data-pd]")) observer.observe(el);
    document.fonts?.ready.then(update);
    update();
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const em = state?.em ?? 16;

  return (
    <svg
      ref={svg}
      aria-hidden
      className="pd-arrows"
      width={state?.w}
      height={state?.h}
      viewBox={state ? `0 0 ${state.w} ${state.h}` : undefined}
    >
      <defs>
        {(Object.keys(HEADS) as (keyof typeof HEADS)[]).map((m) => {
          const s = f(HEADS[m] * em);
          return (
            <marker
              key={m}
              id={`${id}-${m}`}
              viewBox={`0 0 ${s} ${s}`}
              refX={f(s * INSET)}
              refY={f(s / 2)}
              markerWidth={s}
              markerHeight={s}
              markerUnits="userSpaceOnUse"
              orient="auto"
              className={`pd-tip pd-tip-${m}`}
            >
              <path d={`M0,0 L${s},${f(s / 2)} L0,${s} Z`} />
            </marker>
          );
        })}
        {state?.edges.map((e, i) =>
          e.kind === "gradient" ? (
            <linearGradient
              key={i}
              id={`${id}-g${i}`}
              gradientUnits="userSpaceOnUse"
              x1={f(e.x1)}
              y1={f(e.y1)}
              x2={f(e.x2)}
              y2={f(e.y2)}
            >
              <stop offset="0" stopColor="var(--pd-warm-1)" />
              <stop offset="0.55" stopColor="var(--pd-warm-2)" />
              <stop offset="1" stopColor="var(--pd-warm-3)" />
            </linearGradient>
          ) : null,
        )}
      </defs>
      {state?.edges.map((e, i) => (
        <path
          key={i}
          d={e.d}
          className={`pd-edge pd-edge-${e.kind}`}
          style={
            e.kind === "gradient" ? { stroke: `url(#${id}-g${i})` } : undefined
          }
          markerEnd={e.head ? `url(#${id}-${headOf(e.kind)})` : undefined}
        />
      ))}
    </svg>
  );
}

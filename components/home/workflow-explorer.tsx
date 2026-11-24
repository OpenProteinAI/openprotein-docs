'use client';

import {
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  BrainCircuit,
  ChartScatter,
  CheckCheck,
  Combine,
  Database,
  FlaskConical,
  GitBranch,
  ImageIcon,
  Grid3x3,
  ListFilter,
  type LucideIcon,
  Microscope,
  Network,
  RefreshCw,
  ScanSearch,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  WandSparkles,
  Box,
  Pipette,
  Orbit,
} from 'lucide-react';
import { APP_ICONS } from '@/components/home/icons';
import { TOOL_DETAILS } from '@/lib/home-capabilities';
import { cn } from '@/lib/cn';
import {
  type Tool,
  type ToolId,
  TOOLS,
  type Workflow as WorkflowData,
  WORKFLOWS,
  type WorkflowAction,
  type WorkflowStep,
} from '@/lib/home-content';

// Placeholder graphics, keyed by the `graphic` field in lib/home-content.ts.
const GRAPHICS: Record<string, LucideIcon> = {
  antigen: Target,
  'hit-discovery': ScanSearch,
  'de-novo': Sparkles,
  screen: ListFilter,
  complex: Combine,
  library: Grid3x3,
  synthesize: FlaskConical,
  optimize: TrendingUp,
  database: Database,
  enzyme: Microscope,
  fold: Box,
  generate: WandSparkles,
  tree: GitBranch,
  select: CheckCheck,
  cofold: Boxes,
  substitutions: Pipette,
  cro: Truck,
  train: BrainCircuit,
  'active-learning': RefreshCw,
  explore: ChartScatter,
  cluster: Network,
  'inverse-fold': Orbit,
};

const STEP_TINT = 'color-mix(in oklab, var(--brand-1-fill) 12%, transparent)';
const CARD =
  'rounded-[0.75em] border border-fd-border bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:bg-fd-card';

/** The main button's gradient as a layer of its own, because a background-image cannot fade.
 *  Absolute, so the caller positions and rounds it. */
function GradientFill({ active }: { active?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute inset-0 rounded-[inherit] bg-[image:var(--brand-gradient)] transition-opacity',
        active ? 'opacity-100' : 'opacity-[var(--op-icon-tint)] group-hover:opacity-100',
      )}
    />
  );
}

function Graphic({ name, small, active }: { name: string; small?: boolean; active?: boolean }) {
  // The app's own icon where the product has one, so the platform column matches what users meet there.
  // Those are drawn on a 20-unit grid and carry finer detail than lucide's, so they render at that size.
  const app = APP_ICONS[name];
  const Icon = app ?? GRAPHICS[name] ?? Box;
  return (
    <span
      className={cn(
        // Unpicked draws in the label's ink over a wash; picked knocks out of the full ramp in
        // white. `--icon-bg` is the knockout inside the icon, flattened to whatever sits behind.
        'relative flex shrink-0 items-center justify-center bg-[var(--op-icon-bg)] transition-colors [--icon-bg:var(--op-icon-knockout)]',
        active
          ? 'text-white [--icon-bg:var(--brand-gradient-mid)]'
          : `text-fd-foreground
             group-hover:text-white group-hover:[--icon-bg:var(--brand-gradient-mid)]`,
        small ? 'size-8 rounded-lg' : 'size-12 rounded-2xl',
      )}
    >
      <GradientFill active={active} />
      <Icon
        className={cn('relative', small ? (app ? 'size-5' : 'size-4') : app ? 'size-7' : 'size-6')}
      />
    </span>
  );
}

/** One use of a tool in one step: the unit the explorer selects. Compared by identity, so
 *  `usesOf` is computed once per workflow. */
interface Use {
  /** Unique within the workflow; keys elements and refs. */
  key: string;
  /** The step's position in the workflow; alternatives share it. */
  number: number;
  step: WorkflowStep;
  action: WorkflowAction;
  tool: Tool;
}

const toolById = (id: ToolId) => {
  const tool = TOOLS.find((candidate) => candidate.id === id);
  // Unreachable while ToolId is TOOLS' own ids; a silent fallback would draw the wrong card.
  if (!tool) throw new Error(`workflow action names no such tool: ${id}`);
  return tool;
};

/** Every use in the workflow, in display order. */
const usesOf = (workflow: WorkflowData): Use[] =>
  workflow.steps
    // Kept unflattened one level, so a use knows which numbered position it belongs to.
    .flatMap((step, index) =>
      (Array.isArray(step) ? step : [step]).map((option) => ({ option, number: index + 1 })),
    )
    .flatMap(({ option, number }) =>
      (option.actions ?? []).map((action) => ({ step: option, action, number })),
    )
    .map((use, index) => ({ ...use, key: `${index}:${use.action.tool}`, tool: toolById(use.action.tool) }));

interface Focus {
  active: Use;
  uses: Use[];
  /** Props for an element standing for `candidates`: pointing at or focusing it selects the
   *  first, unless the selection is already among them, and pauses the auto-advance while in use. */
  target: (candidates: Use[]) => {
    onPointerEnter: (event: { currentTarget: HTMLElement }) => void;
    onPointerLeave: () => void;
    onFocus: (event: FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
    onClick: () => void;
  };
  register: (key: string) => (el: HTMLElement | null) => void;
  /** Props that pause the auto-advance while the pointer is over a graphic. */
  hold: { onPointerEnter: () => void; onPointerLeave: () => void };
}

// Present only when the workflow shows its tools; steps then drive the graphic.
const FocusContext = createContext<Focus | null>(null);

function StepLabel({ step, number }: { step: WorkflowStep; number?: number }) {
  const focus = useContext(FocusContext);
  // Nothing in this column carries an icon badge, so the number stands in for one and takes the
  // badge's treatment.
  const active = focus?.active.step === step;
  const content = (
    <>
      {number !== undefined && (
        <span
          className={cn(
            `relative flex size-5 shrink-0 items-center justify-center rounded-full
             bg-[var(--op-icon-bg)] text-xs font-semibold tabular-nums transition-colors`,
            active ? 'text-white' : 'text-fd-foreground group-hover:text-white',
          )}
        >
          <GradientFill active={active} />
          <span className="relative">{number}</span>
        </span>
      )}
      <span className="font-semibold text-pretty text-fd-foreground">{step.title}</span>
    </>
  );
  const candidates = focus?.uses.filter((use) => use.step === step) ?? [];
  if (!focus || candidates.length === 0) return <div className="flex items-center gap-3">{content}</div>;
  return (
    <button
      type="button"
      ref={focus.register(`step:${step.title}`)}
      aria-pressed={active}
      {...focus.target(candidates)}
      className="group flex items-center gap-3 text-left"
    >
      {content}
    </button>
  );
}

/** `number` is the step's position in its workflow; alternatives share it. */
function StepCard({ step, number }: { step: WorkflowStep | WorkflowStep[]; number?: number }) {
  const focus = useContext(FocusContext);
  const options = Array.isArray(step) ? step : [step];
  const active = options.some((option) => option === focus?.active.step);
  return (
    <div
      data-step-card
      className={cn(
        CARD,
        // An alternatives card holds two steps, so it lifts for a hovered step rather than for
        // any hover over its own padding.
        'flex flex-col gap-2 px-4 py-2.5 transition-[box-shadow] has-[button:hover]:shadow-[0_1px_6px_rgb(0_0_0/0.07)]',
        active && 'shadow-[0_2px_10px_rgb(0_0_0/0.10)]',
      )}
    >
      {options.map((option, index) => (
        <Fragment key={option.title}>
          {index > 0 && (
            <div className="flex items-center gap-3 text-sm text-fd-muted-foreground">
              <span className="flex-1 border-t border-dashed border-fd-border" />
              or
              <span className="flex-1 border-t border-dashed border-fd-border" />
            </div>
          )}
          <StepLabel step={option} number={number} />
        </Fragment>
      ))}
    </div>
  );
}

// A step row's horizontal metrics, shared with StepSizer so the two measure the same.
const STEP_ROW = 'flex items-start gap-2.5 px-3';
const STEP_LINE = 'flex items-baseline gap-1.5';
const STEP_OR = 'text-sm text-fd-muted-foreground italic';

/** One numbered row of the compact column: the badge, then the step — or both alternatives on
 *  the line, joined by "or". Each row is a `[data-step-card]`, so the connectors still measure it. */
function StepRow({ step, number }: { step: WorkflowStep | WorkflowStep[]; number: number }) {
  const focus = useContext(FocusContext);
  const options = Array.isArray(step) ? step : [step];
  const active = options.some((option) => option === focus?.active.step);

  return (
    <div data-step-card className={cn(STEP_ROW, 'py-1.5')}>
      <span
        ref={focus ? focus.register(`badge:${number}`) : undefined}
        className={cn(
          `relative mt-px flex size-5 shrink-0 items-center justify-center rounded-full
           bg-[var(--op-icon-bg)] text-xs font-semibold tabular-nums transition-colors`,
          active ? 'text-white' : 'text-fd-foreground',
        )}
      >
        <GradientFill active={active} />
        <span className="relative">{number}</span>
      </span>

      {/* Alternatives stack rather than run on: the pair reads the same either way, and one
          line each keeps the column from sizing to both of them together. */}
      <span className="flex min-w-0 flex-col gap-0.5 leading-snug">
        {options.map((option, index) => {
          const candidates = focus?.uses.filter((use) => use.step === option) ?? [];
          const label = <span className="text-pretty">{option.title}</span>;
          return (
            <span key={option.title} className={STEP_LINE}>
              {index > 0 && <span className={STEP_OR}>or</span>}
              {focus && candidates.length > 0 ? (
                <button
                  type="button"
                  ref={focus.register(`step:${option.title}`)}
                  aria-pressed={option === focus.active.step}
                  {...focus.target(candidates)}
                  className={cn(
                    'cursor-pointer text-left transition-colors hover:text-fd-primary',
                    option === focus.active.step ? 'font-semibold' : 'text-fd-foreground',
                  )}
                >
                  {label}
                </button>
              ) : (
                // A step no tool serves — the wet-lab one — is not a target, so it is not a button.
                <span className="text-fd-muted-foreground">{option.title}</span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}

/** The wide layout's left column: every step in one card, the way the compact views show it.
 *  The loop back is drawn in the overlay, from the rows' measured positions. */
function StepList({ workflow }: { workflow: WorkflowData }) {
  return (
    // Takes the row's height, like the cards beside it, and StepSizer's width, so it keeps one size
    // across the tabs. The steps keep one pitch from the top, the most the longest workflow fits.
    <div className={cn(CARD, 'h-full py-2')}>
      <div className="flex flex-col gap-3.5">
        {workflow.steps.map((step, index) => (
          <StepRow key={stepKey(step)} step={step} number={index + 1} />
        ))}
      </div>
      <StepSizer />
    </div>
  );
}

/** Every tab's steps, one per line and set semibold as if picked, at no height: the column sizes
 *  to the widest line of any tab, and a tab with shorter steps takes the slack as space. */
function StepSizer() {
  return (
    <div aria-hidden className="invisible h-0 overflow-hidden">
      {WORKFLOWS.flatMap((workflow) =>
        workflow.steps.flatMap((step) =>
          (Array.isArray(step) ? step : [step]).map((option, index) => (
            <div key={`${workflow.label}:${option.title}`} className={STEP_ROW}>
              <span className="size-5 shrink-0" />
              <span className={STEP_LINE}>
                {index > 0 && <span className={STEP_OR}>or</span>}
                <span className="font-semibold">{option.title}</span>
              </span>
            </div>
          )),
        ),
      )}
    </div>
  );
}

const stepKey = (step: WorkflowStep | WorkflowStep[]) =>
  Array.isArray(step) ? step.map((option) => option.title).join('|') : step.title;

/** Index of the step the last step loops back to, or -1. */
const loopIndex = (workflow: WorkflowData) =>
  workflow.steps.findIndex((step) => !Array.isArray(step) && step.title === workflow.loopTo);

function ColumnTitle({ children }: { children: string }) {
  return (
    // Ranged left, so each label starts on its card's own edge rather than floating over it, and
    // sat at the foot of the header row — which the tabs make taller — to stay near its card.
    <p className="self-end text-2xs font-semibold tracking-caps text-fd-muted-foreground uppercase">
      {children}
    </p>
  );
}

// The step cards, stacked; the loop's return path is drawn in the overlay from measured positions.
function StepColumn({ workflow }: { workflow: WorkflowData }) {
  return workflow.steps.map((step, index) => <StepCard key={stepKey(step)} step={step} number={index + 1} />);
}

// The edge and the lit badge carry the selection; the label stays put, and only the icon
// inverts with the gradient behind it.
function ToolCardContent({ tool, active }: { tool: Tool; active?: boolean }) {
  return (
    <>
      <Graphic name={tool.graphic} small active={active} />
      <span className="font-medium text-fd-foreground">{tool.title}</span>
      {/*
        The app's tools menu keeps its arrow hidden and slides it in on hover (opacity 0 and
        translateX(-0.375rem), 200ms ease, in ToolGroupColumns.vue). Same here, and the picked-out
        card shows it too — however it was picked, pointer, keyboard or the auto-advance.
      */}
      <ArrowRight
        className={cn(
          `ml-auto hidden size-4 shrink-0 text-fd-foreground transition-[opacity,translate]
           duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100
           group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block`,
          active ? 'translate-x-0 opacity-100' : '-translate-x-1.5 opacity-0',
        )}
      />
    </>
  );
}

/** A tool card; `candidates` are its uses in the shown workflow, none when it sits idle. */
function ToolCard({ tool, candidates, refKey }: { tool: Tool; candidates: Use[]; refKey: string }) {
  const focus = useContext(FocusContext)!;
  if (candidates.length === 0) {
    return (
      <div className={cn(CARD, 'flex items-center gap-3 px-4 py-2.5 opacity-30')}>
        <ToolCardContent tool={tool} />
      </div>
    );
  }
  const active = candidates.includes(focus.active);
  return (
    <button
      type="button"
      ref={focus.register(refKey)}
      aria-pressed={active}
      {...focus.target(candidates)}
      className={cn(
        CARD,
        // A tool the workflow uses reads at full strength whether or not it is the picked one,
        // like the step cards; only the shadow, the lit icon and the edge carry the selection.
        'group flex items-center gap-3 px-4 py-2.5 text-left transition-[box-shadow]',
        active ? 'shadow-[0_2px_10px_rgb(0_0_0/0.10)]' : 'hover:shadow-[0_1px_6px_rgb(0_0_0/0.07)]',
      )}
    >
      <ToolCardContent tool={tool} active={active} />
    </button>
  );
}

/** One row of the platform card: the tool, lit while the diagram is pointing at it. Pointing at
 *  or clicking a row moves the feature card onto it, as the main version's tool cards do; it
 *  carries no arrow, because the ways in are the links on that card rather than here. */
function ToolRow({ tool, candidates }: { tool: Tool; candidates: Use[] }) {
  const focus = useContext(FocusContext)!;

  if (candidates.length === 0) {
    // A tool this workflow never reaches for: nothing to select, so not a control.
    return (
      <div className="flex items-center gap-3 px-3 py-2 opacity-30">
        <Graphic name={tool.graphic} small />
        <span className="font-medium text-fd-foreground">{tool.title}</span>
      </div>
    );
  }

  const active = candidates.includes(focus.active);
  return (
    <button
      type="button"
      ref={focus.register(`box:${tool.id}`)}
      aria-pressed={active}
      {...focus.target(candidates)}
      className="group flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left"
    >
      <Graphic name={tool.graphic} small active={active} />
      <span
        className={cn(
          'text-fd-foreground transition-colors group-hover:text-fd-primary',
          active ? 'font-semibold' : 'font-medium',
        )}
      >
        {tool.title}
      </span>
    </button>
  );
}

/** The wide layout's right column: the seven tools in one card, matching the step list. */
function ToolList({ uses }: { uses: Use[] }) {
  return (
    <div className={cn(CARD, 'flex flex-col gap-0.5 py-2')}>
      {TOOLS.map((tool) => (
        <ToolRow key={tool.id} tool={tool} candidates={uses.filter((use) => use.tool === tool)} />
      ))}
    </div>
  );
}

type Picture = { src: string; width: number; height: number };

const shot = (name: string, width: number, height: number): Picture => ({
  src: `/_static/home/${name}.webp`,
  width,
  height,
});

/** App screenshots by workflow label, then step title. */
const STEP_IMAGES: Record<string, Record<string, Picture>> = {
  Antibodies: {
    'Visualize your target antigen': shot('ab-1-visualize-target-antigen', 2940, 1846),
    'Design a de novo antibody': shot('ab-2a-design-de-novo-antibody', 2940, 1844),
    'Select a hit from initial screening': shot('ab-2b-hit-selection', 2940, 1848),
    'Visualize your binding complex': shot('ab-3-visualize-binding-complex', 2940, 1846),
    'Design initial mutagenesis library': shot('ab-4-design-initial-mutagenesis-lib', 2938, 1846),
    'Learn from your results': shot('ab-6-learn-from-your-results', 2940, 1842),
    'Design a follow-up library': shot('ab-7-design-follow-up-lib', 2940, 1844),
  },
  Enzymes: {
    'Discover from natural databases': shot('enzy-1-discover-from-natural-db', 2940, 1844),
    'Fold and visualize starting protein': shot('enzy-2-fold-visualize-starting-protein', 1472, 922),
    'Design initial mutagenesis library': shot('enzy-3-design-initial-mutagenesis-lib', 2938, 1846),
    'Learn from your results': shot('enzy-5-learn-from-your-result', 2940, 1844),
    'Design a follow-up library': shot('enzy-6-design-follow-up-library', 1471, 922),
  },
  'General Protein Engineering': {
    Explore: shot('general-1-explore', 2938, 1842),
    Visualize: shot('general-2-visualize', 2940, 1842),
    'Design de novo': shot('general-3-design-de-novo', 2938, 1844),
    'Design mutagenesis library': shot('general-4-design-mutagenesis-lib', 2940, 1846),
    'Learn from your results': shot('general-5-learn-from-your-results', 2940, 1846),
    'Design a follow-up library': shot('general-6-design-follow-up-library', 2938, 1844),
  },
};

/** The action's illustration with its own caption under it — the tool, what it does at this
 *  step, and the three ways in. The connectors aim at `imageRef`, so they meet the picture
 *  rather than the middle of the caption. */
function FeatureGraphic({
  use,
  workflow,
  imageRef,
  fill,
}: {
  use: Use;
  workflow: string;
  imageRef?: (el: HTMLElement | null) => void;
  /** Take the height the row gives us, and let the picture absorb whatever the caption leaves,
   *  so the card ends level with the tool column beside it. */
  fill?: boolean;
}) {
  const Icon = GRAPHICS[use.action.graphic ?? use.tool.graphic] ?? ImageIcon;
  const detail = TOOL_DETAILS[use.tool.id];
  const image = STEP_IMAGES[workflow]?.[use.step.title];
  return (
    <div
      key={use.key}
      className={cn(
        CARD,
        'animate-fd-fade-in overflow-hidden shadow-[0_8px_32px_rgb(0_0_0/0.08)]',
        fill && 'flex h-full flex-col',
      )}
    >
      <div
        ref={imageRef}
        className={cn(fill && 'relative min-h-0 flex-1 overflow-hidden border-b border-fd-border')}
      >
        {image ? (
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            sizes="(min-width: 64em) 45vw, 90vw"
            className={cn(
              'object-cover object-top',
              fill ? 'absolute inset-0 size-full' : 'aspect-[16/10] w-full border-b border-fd-border',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center',
              fill
                ? 'absolute inset-0 size-full'
                : 'aspect-[16/10] w-full border-b border-fd-border',
            )}
            style={{ background: STEP_TINT, color: 'var(--brand-1-ink)' }}
          >
            <Icon className="size-24" strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="flex flex-col p-4">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-fd-foreground">{use.tool.title}</span>
          <span className="text-2xs tracking-caps text-fd-muted-foreground uppercase">
            step {use.number}
          </span>
        </p>
        <p className="text-pretty text-fd-muted-foreground">{use.action.text}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {detail.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-fd-primary underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

type Point = [number, number];

const fmt = (n: number) => n.toFixed(1);

/** How far back from a corner the bend starts; clamped to half a leg when the leg is shorter. */
const CORNER = 10;

/** The shortest run into the graphic's side that still reads as a turn rather than a nick. */
const TURN = 28;

/** How far past a tool column's edge the bypass lane sits, within the panel's 1.5rem padding. */
const OUTSIDE = 14;

/** Tailwind's `sm`: under it the compact layout is on a phone, and drops its connectors. */
const PHONE = '40rem';

/** A right-angle polyline between two cards, corners rounded off with a quadratic bend. Headless
 *  — the layout says which way the connectors run. */
function linePath(points: Point[]) {
  const at = ([x, y]: Point) => `${fmt(x)} ${fmt(y)}`;
  let d = `M ${at(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, corner, next] = [points[i - 1], points[i], points[i + 1]];
    const legs = [
      Math.hypot(corner[0] - prev[0], corner[1] - prev[1]),
      Math.hypot(next[0] - corner[0], next[1] - corner[1]),
    ];
    const r = Math.min(CORNER, legs[0] / 2, legs[1] / 2);
    if (r < 0.5) {
      d += ` L ${at(corner)}`;
      continue;
    }
    const lerp = (from: Point, to: Point, distance: number, length: number): Point => [
      from[0] + ((to[0] - from[0]) / length) * distance,
      from[1] + ((to[1] - from[1]) / length) * distance,
    ];
    d += ` L ${at(lerp(corner, prev, r, legs[0]))} Q ${at(corner)} ${at(lerp(corner, next, r, legs[1]))}`;
  }
  return `${d} L ${at(points[points.length - 1])}`;
}

/** The polyline cut back to `fraction` of its length, keeping its start: a line that retracts. */
function trimmed(points: Point[], fraction: number): Point[] {
  const legs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let left = legs.reduce((a, b) => a + b, 0) * fraction;
  const out: Point[] = [points[0]];
  for (let i = 0; i < legs.length; i++) {
    if (left >= legs[i]) {
      out.push(points[i + 1]);
      left -= legs[i];
      continue;
    }
    const t = legs[i] > 0 ? left / legs[i] : 0;
    const [from, to] = [points[i], points[i + 1]];
    out.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    break;
  }
  return out;
}

/** The same polyline with a chevron head at its end, as one path. The loop runs backwards against
 *  the flow, so unlike the other connectors it has to say which way it goes. */
function headedPath(points: Point[], head = 5.6) {
  const [tx, ty] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const length = Math.hypot(tx - px, ty - py);
  const [ux, uy] = length > 0.5 ? [(tx - px) / length, (ty - py) / length] : [0, 1];
  const [bx, by] = [tx - ux * head, ty - uy * head];
  const wing = head / 2;
  // One continuous subpath (tip, wing, tip, wing): Chrome restarts dashes at each new subpath.
  return `${linePath(points)} L ${fmt(bx - uy * wing)} ${fmt(by + ux * wing)} L ${fmt(tx)} ${fmt(ty)} L ${fmt(bx + uy * wing)} ${fmt(by - ux * wing)}`;
}

// The return path runs up a lane in the column's 2rem gutter. Half that gutter, so it sits as far
// out on the left as the outgoing arrows' turn does on the right.
const LOOP_LANE = 16;

/** The loop's return path, from the step cards under `root`; none when there is no loop. */
function loopPath(root: HTMLElement, loopStart: number): string | undefined {
  const o = root.getBoundingClientRect();
  const cards = [...root.querySelectorAll('[data-step-card]')].map((card) => card.getBoundingClientRect());
  const [target, last] = [cards[loopStart], cards[cards.length - 1]];
  if (!target || !last || target === last) return undefined;
  const middle = (r: DOMRect) => (r.top + r.bottom) / 2 - o.top;
  const lane = target.left - LOOP_LANE - o.left;
  return headedPath([
    [last.left - o.left, middle(last)],
    [lane, middle(last)],
    [lane, middle(target)],
    [target.left - 2 - o.left, middle(target)],
  ]);
}

function Loop({ d }: { d?: string }) {
  return d ? (
    <path d={d} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" />
  ) : null;
}

interface DesktopPaths {
  /** From the active step and its tool card into the middle graphic. */
  active: string[];
  /** One short arrow from each step's number down to the next, so the column reads as a run. */
  flow: string[];
  loop?: string;
}

/** Every drop is the same length and sits in the middle of its gap, so the two-line step does
 *  not get a longer arrow than the rest — only more clearance either side of it. FLOW_GAP is
 *  the least clearance a gap must leave before a drop is drawn there at all. */
const FLOW_LEN = 14;
const FLOW_HEAD = 4;
const FLOW_GAP = 6;

/** The drops between consecutive step numbers, measured from the badges themselves: a two-line
 *  step pushes the next badge further down, so the gap is not any element's own height. */
function flowPaths(elements: Map<string, HTMLElement>, o: DOMRect): string[] {
  const paths: string[] = [];
  for (let n = 1; ; n++) {
    const [from, to] = [elements.get(`badge:${n}`), elements.get(`badge:${n + 1}`)];
    if (!from || !to) return paths;
    const [a, b] = [from.getBoundingClientRect(), to.getBoundingClientRect()];
    // Too tight to sit clear of both badges: better no drop than a blot against them.
    if (b.top - a.bottom < FLOW_LEN + 2 * FLOW_GAP) continue;
    const x = a.left + a.width / 2 - o.left;
    const middle = (a.bottom + b.top) / 2 - o.top;
    paths.push(
      headedPath(
        [
          [x, middle - FLOW_LEN / 2],
          [x, middle + FLOW_LEN / 2],
        ],
        FLOW_HEAD,
      ),
    );
  }
}

/** Right-angle arrows from the active step and its tool card into the middle graphic, plus the loop. */
function useArrows(active: Use, loopStart: number) {
  const container = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<DesktopPaths>({ active: [], flow: [] });

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(key, el);
      else elements.current.delete(key);
    },
    [],
  );

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const measure = () => {
      const step = elements.current.get(`step:${active.step.title}`);
      const box = elements.current.get(`box:${active.tool.id}`);
      const graphic = elements.current.get('graphic');
      // Hidden below lg, where the three columns stack.
      if (!step || !box || !graphic || graphic.offsetParent === null)
        return setPaths({ active: [], flow: [] });
      const o = root.getBoundingClientRect();
      const s = step.getBoundingClientRect();
      const c = (step.closest('[data-step-card]') ?? step).getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const g = graphic.getBoundingClientRect();
      const gy = g.top + g.height / 2 - o.top;
      const left = (c.right + g.left) / 2 - o.left;
      const right = (b.left + g.right) / 2 - o.left;
      const [sy, by] = [s.top + s.height / 2 - o.top, b.top + b.height / 2 - o.top];
      setPaths({
        loop: loopPath(root, loopStart),
        flow: flowPaths(elements.current, o),
        active: [
          linePath([[c.right - o.left, sy], [left, sy], [left, gy], [g.left - o.left - 3, gy]]),
          linePath([[b.left - o.left, by], [right, by], [right, gy], [g.right - o.left + 3, gy]]),
        ],
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [active, loopStart]);

  return { container, register, paths };
}

/** Solid connector strokes, at the same weight as the loop's arrow. */
const CONNECTOR = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Draws itself in whenever `replay` changes; later re-measures only move it. */
function Connector({ d, replay }: { d: string; replay: string }) {
  const ref = useRef<SVGPathElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  }, [replay]);
  return <path ref={ref} d={d} {...CONNECTOR} />;
}

type Shared = Omit<Focus, 'register'>;

function DesktopWorkflow({
  workflow,
  shared,
  tabs,
}: {
  workflow: WorkflowData;
  shared: Shared;
  tabs: ReactNode;
}) {
  const { container, register, paths } = useArrows(shared.active, loopIndex(workflow));

  return (
    <FocusContext.Provider value={{ ...shared, register }}>
      <div
        ref={container}
        // Side columns size to their own labels; whatever is left over goes to the graphic.
        className="relative hidden gap-x-8 gap-y-3 lg:grid lg:grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,max-content)_minmax(0,1fr)_minmax(0,max-content)]"
      >
        <ColumnTitle>Your workflow</ColumnTitle>
        <div className="self-center">{tabs}</div>
        <ColumnTitle>Our platform</ColumnTitle>

        <div className="self-stretch">
          <StepList workflow={workflow} />
        </div>
        {/* The anchor stays on the picture alone, so the arrows keep aiming at it. */}
        <div className="self-stretch" {...shared.hold}>
          <FeatureGraphic use={shared.active} workflow={workflow.label} imageRef={register('graphic')} fill />
        </div>
        <div className="self-start">
          <ToolList uses={shared.uses} />
        </div>
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible text-[var(--op-connector)]">
          <Loop d={paths.loop} />
          {paths.flow.map((d, index) => (
            <path
              key={index}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {paths.active.map((d, index) => (
            <Connector key={index} d={d} replay={shared.active.key} />
          ))}
        </svg>
      </div>
    </FocusContext.Provider>
  );
}

interface CompactPaths {
  arrows: string[];
  /** The previous selection's arrows: the drop retracts with its closing dropdown, then fades. */
  closing: { d: string; opacity: number }[];
  loop?: string;
}

// Matches the dropdown's duration-[480ms]; the settle window outlasts it.
const DROPDOWN_MS = 480;
const SETTLE_MS = DROPDOWN_MS + 150;

/** A row of the compact layout: a step (or alternatives) with the tools it uses. */
interface Stage {
  key: string;
  step: WorkflowStep | WorkflowStep[];
  uses: Use[];
}

const stagesOf = (workflow: WorkflowData, uses: Use[]): Stage[] =>
  workflow.steps.map((step) => {
    const options = Array.isArray(step) ? step : [step];
    return { key: stepKey(step), step, uses: uses.filter((use) => options.includes(use.step)) };
  });

const stageOf = (stages: Stage[], use: Use) => stages.find((stage) => stage.uses.includes(use));

/** Below lg each stage is a row, with the active stage's graphic dropping open under it. The page
 *  scrolls to hold `anchor` still while heights change, so nothing moves under the cursor. */
function CompactWorkflow({
  workflow,
  shared,
  anchor,
}: {
  workflow: WorkflowData;
  shared: Shared;
  anchor: { current: HTMLElement | null };
}) {
  const container = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const shown = useRef(new Map<string, Use>());
  const [paths, setPaths] = useState<CompactPaths>({ arrows: [], closing: [] });
  // The selection whose dropdown is closing, while it closes.
  const closing = useRef<{ use: Use; stage: string } | null>(null);

  const { active } = shared;
  const previous = useRef(active);

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.current.set(key, el);
      else elements.current.delete(key);
    },
    [],
  );

  const stages = useMemo(() => stagesOf(workflow, shared.uses), [workflow, shared.uses]);
  const activeStage = useMemo(() => stageOf(stages, active), [stages, active]);

  const measure = useCallback((sync = false) => {
    const root = container.current;
    if (!root || root.offsetParent === null) return;
    const o = root.getBoundingClientRect();
    const next: CompactPaths = { arrows: [], closing: [] };
    // On a phone the two columns sit close enough to read as one list, and a connector threading
    // between them would only crowd it; the loop arrow still runs, since it carries the flow.
    const wired = window.matchMedia(`(min-width: ${PHONE})`).matches;
    if (!wired) closing.current = null;

    // The two legs from a use's step and tool card into its stage's graphic, in container space.
    // They leave the picked cards and turn in at the graphic's sides.
    const legs = (use: Use, stage: string): Point[][] | undefined => {
      const step = elements.current.get(`step:${use.step.title}`);
      const box = elements.current.get(`box:${stage}:${use.tool.id}`);
      const graphic = elements.current.get(`graphic:${stage}`);
      if (!step || !box || !graphic) return undefined;
      const c = (step.closest('[data-step-card]') ?? step).getBoundingClientRect();
      const b = box.getBoundingClientRect();
      const column = (box.closest('[data-tool-column]') ?? box).getBoundingClientRect();
      const g = graphic.getBoundingClientRect();
      // Each drop runs down the strip between its column's outer edge and the graphic's, so it
      // stays clear of the image; it prefers the column's middle when that much room is there.
      const lane = Math.min(c.left + c.width / 2, g.left - TURN) - o.left;
      const far = Math.max(b.left + b.width / 2, g.right + TURN) - o.left;
      if (lane >= c.left - o.left && far <= b.right - o.left) {
        const gy = (g.top + g.bottom) / 2 - o.top;
        const steps: Point[] = [[lane, c.bottom - o.top], [lane, gy], [g.left - o.left - 3, gy]];
        // With cards stacked under the picked one, a drop from its underside would cross them, so
        // it leaves sideways and passes them in the panel's own padding instead.
        if (column.bottom - b.bottom < 1)
          return [steps, [[far, b.bottom - o.top], [far, gy], [g.right - o.left + 3, gy]]];
        const outside = b.right - o.left + OUTSIDE;
        return [
          steps,
          [
            [b.right - o.left, (b.top + b.bottom) / 2 - o.top],
            [outside, (b.top + b.bottom) / 2 - o.top],
            [outside, gy],
            [g.right - o.left + 3, gy],
          ],
        ];
      }
      // Once the graphic is as wide as the columns there is no strip beside it to run down, so the
      // drops land on its top edge instead — still leaving from under the cards.
      const top = g.top - o.top - 3;
      // Kept off the corners, where a line would read as missing the image rather than meeting it.
      const onto = (x: number) => Math.min(Math.max(x, g.left - o.left + 16), g.right - o.left - 16);
      const from = onto(c.left + c.width / 2 - o.left);
      const steps: Point[] = [[from, c.bottom - o.top], [from, top]];
      if (column.bottom - b.bottom < 1) {
        const under = onto(b.left + b.width / 2 - o.left);
        return [steps, [[under, b.bottom - o.top], [under, top]]];
      }
      // Cards below the picked one leave no clear way down, so this one slips out into the gutter
      // between the columns and drops from there.
      const gutter = onto((c.right + b.left) / 2 - o.left);
      const by = (b.top + b.bottom) / 2 - o.top;
      return [steps, [[b.left - o.left, by], [gutter, by], [gutter, top]]];
    };
    const current = wired && activeStage && legs(active, activeStage.key);
    if (current) next.arrows = current.map((points) => linePath(points));

    if (closing.current) {
      const { use, stage } = closing.current;
      const wrapper = elements.current.get(`drop:${stage}`);
      const content = wrapper?.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
      const open = wrapper && content ? wrapper.getBoundingClientRect().height / (content.offsetHeight || 1) : 0;
      const old = legs(use, stage);
      if (old && open > 0.01) {
        const fraction = Math.min(1, open);
        next.closing = old.map((points) => ({
          d: linePath(trimmed(points, fraction)),
          opacity: Math.min(1, fraction * 3),
        }));
      } else closing.current = null;
    }

    next.loop = loopPath(root, loopIndex(workflow));
    const same = (prev: CompactPaths) =>
      prev.loop === next.loop &&
      prev.arrows.join() === next.arrows.join() &&
      JSON.stringify(prev.closing) === JSON.stringify(next.closing);
    const update = () => setPaths((prev) => (same(prev) ? prev : next));
    // Inside a frame callback, commit before paint so the arrows never trail the scroll correction.
    if (sync) flushSync(update);
    else update();
  }, [active, activeStage, workflow]);

  useLayoutEffect(() => {
    const was = previous.current;
    previous.current = active;
    const wasStage = stageOf(stages, was);
    // Switching between selections of one stage keeps its dropdown open: nothing closes.
    closing.current = wasStage && wasStage !== activeStage ? { use: was, stage: wasStage.key } : null;

    const root = container.current;
    if (!root || root.offsetParent === null) return;
    const rows = [...root.querySelectorAll<HTMLElement>('[data-row]')];
    const held =
      anchor.current && root.contains(anchor.current)
        ? anchor.current
        : rows.find((row) => row.getBoundingClientRect().bottom > 0);
    anchor.current = null;
    const startTop = held?.getBoundingClientRect().top;

    const until = performance.now() + SETTLE_MS;
    let frame = 0;
    const tick = (sync: boolean) => {
      if (held && startTop !== undefined) {
        const drift = held.getBoundingClientRect().top - startTop;
        if (Math.abs(drift) > 0.5) window.scrollTo({ top: window.scrollY + drift, behavior: 'instant' });
      }
      measure(sync);
      if (performance.now() < until) frame = requestAnimationFrame(() => tick(true));
    };
    tick(false);
    return () => cancelAnimationFrame(frame);
  }, [active, activeStage, anchor, measure, stages]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <FocusContext.Provider value={{ ...shared, register }}>
      <div ref={container} className="relative [overflow-anchor:none] lg:hidden">
        <div className="mb-3 grid grid-cols-2 gap-x-4 sm:gap-x-16">
          <ColumnTitle>Your workflow</ColumnTitle>
          <ColumnTitle>Our platform</ColumnTitle>
        </div>
        {stages.map(({ key, step, uses }, index) => {
          const open = uses.includes(active);
          // A closing dropdown keeps showing what it showed while open.
          if (open) shown.current.set(key, active);
          const graphicUse = shown.current.get(key) ?? uses[0];
          const tools = [...new Set(uses.map((use) => use.tool))].map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              refKey={`box:${key}:${tool.id}`}
              candidates={uses.filter((use) => use.tool === tool)}
            />
          ));
          return (
            <Fragment key={key}>
              {index > 0 && <div className="h-3" />}
              <div data-row className="grid grid-cols-2 items-start gap-x-4 sm:gap-x-16">
                <StepCard step={step} number={index + 1} />
                <div data-tool-column className="flex flex-col gap-3">
                  {tools}
                </div>
              </div>
              {graphicUse && (
                <div
                  ref={register(`drop:${key}`)}
                  aria-hidden={!open}
                  className={cn(
                    'grid transition-[grid-template-rows] duration-[480ms] ease-out motion-reduce:transition-none',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                  {...shared.hold}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="pt-10 pb-2">
                      <div className="mx-auto w-full max-w-xs">
                        <FeatureGraphic
                          use={graphicUse}
                          workflow={workflow.label}
                          imageRef={register(`graphic:${key}`)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible text-[var(--op-connector)]">
          <Loop d={paths.loop} />
          {paths.closing.map(({ d, opacity }, index) => (
            <path key={index} d={d} fill="none" stroke="currentColor" strokeLinejoin="round" strokeOpacity={opacity} />
          ))}
          {paths.arrows.map((d, index) => (
            <Connector key={index} d={d} replay={active.key} />
          ))}
        </svg>
      </div>
    </FocusContext.Provider>
  );
}

const AUTO_ADVANCE_MS = 5_000;

function WorkflowWithTools({ workflow, tabs }: { workflow: WorkflowData; tabs: ReactNode }) {
  const uses = useMemo(() => usesOf(workflow), [workflow]);
  // Every step is drawn from its selected use, so a workflow whose steps name no tools has
  // nothing to select and nothing to draw.
  const [active, setActive] = useState<Use | undefined>(uses[0]);
  const [hovering, setHovering] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [inView, setInView] = useState(false);
  const section = useRef<HTMLDivElement>(null);
  // The element the user is pointing at or focusing, so the compact layout can hold it still.
  const anchor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  // With nothing hovered or keyboard-focused, act as if the next use is hovered every 5s. Paused
  // off screen: in the compact layout a change there would shift the page under the reader.
  useEffect(() => {
    if (!active || hovering || keyboardFocus || !inView) return;
    const timer = window.setTimeout(() => {
      anchor.current = null;
      setActive(uses[(uses.indexOf(active) + 1) % uses.length]);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [active, hovering, keyboardFocus, inView, uses]);

  if (!active) return null;

  // The current selection when it is among the candidates, else the first of them.
  const pick = (candidates: Use[]) => (candidates.includes(active) ? active : candidates[0]);
  const select = (candidates: Use[], from: HTMLElement) => {
    const next = pick(candidates);
    if (next !== active) {
      anchor.current = from;
      setActive(next);
    }
  };

  const shared: Shared = {
    active,
    uses,
    target: (candidates) => ({
      onPointerEnter: (event) => {
        select(candidates, event.currentTarget);
        setHovering(true);
      },
      onPointerLeave: () => setHovering(false),
      // Mouse clicks focus buttons too; only keyboard focus should hold the rotation.
      onFocus: (event) => {
        select(candidates, event.currentTarget);
        setKeyboardFocus(event.currentTarget.matches(':focus-visible'));
      },
      onBlur: () => setKeyboardFocus(false),
      onClick: () => setActive(pick(candidates)),
    }),
    hold: { onPointerEnter: () => setHovering(true), onPointerLeave: () => setHovering(false) },
  };

  return (
    <div ref={section}>
      <DesktopWorkflow workflow={workflow} shared={shared} tabs={tabs} />
      <CompactWorkflow workflow={workflow} shared={shared} anchor={anchor} />
    </div>
  );
}

/** The workflow picker. It renders twice, over the graphic and above the stacked panel, so
 *  `idPrefix` keeps the two copies' tab ids apart. */
function WorkflowTabs({
  active,
  onSelect,
  idPrefix,
  track,
  className,
}: {
  active: number;
  /** `viaKeyboard` asks the explorer to put focus back on the tab once it has remounted. */
  onSelect: (index: number, viaKeyboard?: boolean) => void;
  idPrefix: string;
  /** The pill track, which sits on the page in one copy and on the grey panel in the other. */
  track: string;
  className?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow, Home and End move between tabs and take the selection with them, which is what
  // role="tab" promises. Only the selected tab is tabbable, so Tab leaves the group.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = WORKFLOWS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (active === last ? 0 : active + 1)
      : event.key === 'ArrowLeft' ? (active === 0 ? last : active - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onSelect(next, true);
  };

  // Narrow enough and the track scrolls rather than wraps, so the picked tab can sit off screen —
  // as on the marketing site, bring it back to the middle whenever the selection changes.
  useEffect(() => {
    const nav = list.current;
    const button = buttons.current[active];
    if (!nav || !button || nav.scrollWidth <= nav.clientWidth) return;
    const navBox = nav.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    nav.scrollBy({
      left: buttonBox.left - navBox.left - navBox.width / 2 + buttonBox.width / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [active]);

  return (
    <div className={cn('flex max-w-full justify-center', className)}>
      <div
        ref={list}
        role="tablist"
        aria-label="Workflow"
        onKeyDown={onKeyDown}
        className={cn(
          'inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[1.5rem] p-1',
          // The scroll stops on a tab's centre, so a swipe never leaves one half cut off.
          'snap-x snap-mandatory scroll-px-4',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          track,
        )}
      >
        {WORKFLOWS.map((w, index) => (
          <button
            key={w.label}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-${index}`}
            aria-selected={index === active}
            aria-controls="workflow-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => onSelect(index)}
            className={cn(
              'shrink-0 cursor-pointer snap-center rounded-[1.5rem] font-medium whitespace-nowrap transition-[background,color]',
              // Tighter pills while the track is cramped; the roomier ones return with the space.
              'px-4 py-2 text-sm min-[71.25rem]:px-6 min-[71.25rem]:text-base',
              index === active
                ? // The tabs sit above the diagram, so they take the flat grey rather than the
                  // gradient the cards inside it carry.
                  'bg-[var(--op-select-fill)] text-white'
                : 'text-fd-foreground hover:bg-white/60 dark:hover:bg-fd-background/60',
            )}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorkflowExplorer() {
  const [active, setActive] = useState(0);
  const workflow = WORKFLOWS[active];
  const refocus = useRef(false);

  const select = (index: number, viaKeyboard = false) => {
    refocus.current = viaKeyboard;
    setActive(index);
  };

  // Switching workflows remounts the wide tablist, so a tab that moved the selection by keyboard
  // is gone before it can refocus; find its replacement by id and give the focus back.
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    for (const prefix of ['workflow-tab-wide', 'workflow-tab']) {
      const tab = document.getElementById(`${prefix}-${active}`);
      if (tab && tab.offsetParent !== null) return tab.focus();
    }
  }, [active]);

  return (
    // The section carries the anchor because the diagram has no heading of its own, so it can
    // still be deep-linked to.
    <section id="see-where-our-models-fit-in-your-workflow" className="scroll-mt-24 pt-10 pb-2">
      {/* The diagram breaks out of the landing column so the screenshots get more room; the tabs
          inside it stay on the column, so they line up with the sections around them. */}
      <div
        role="tabpanel"
        id="workflow-panel"
        // Both copies of the tablist are display:none at the other breakpoint, so neither tab
        // can name this panel at every width; a label of its own always resolves.
        aria-label={`${WORKFLOWS[active].label} workflow`}
        className="rounded-2xl bg-[var(--op-panel-bg)] px-4 py-8 sm:px-6 lg:relative lg:left-1/2 lg:w-[max(100%,min(87.5rem,100vw-4rem))] lg:-translate-x-1/2"
      >
        {/* Once the columns stack there is no middle column to sit over, so the tabs lead the
            panel instead — still inside it, on the same grey, so they read as one component. */}
        <WorkflowTabs
          active={active}
          onSelect={select}
          idPrefix="workflow-tab"
          track="bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:bg-fd-card"
          className="mb-6 lg:hidden"
        />

        <WorkflowWithTools
          key={workflow.label}
          workflow={workflow}
          tabs={
            <WorkflowTabs
              active={active}
              onSelect={select}
              idPrefix="workflow-tab-wide"
              track="bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:bg-fd-card"
            />
          }
        />
      </div>
    </section>
  );
}

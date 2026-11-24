import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { PlatformDiagramArrows } from "@/components/mdx/platform-diagram-arrows";
import { PlatformDiagramZoom } from "@/components/mdx/platform-diagram-zoom";

const DIR = "/_static/platform_overview";

// The wide layout is the reference's columns, inputs on top, on a 1450 × 725 board.
type Frame = { x: number; y: number; w: number; h: number };
const BOARD: Frame = { x: 0, y: 0, w: 1450, h: 725 };
const INPUTS: Frame = { x: 0, y: 0, w: 838, h: 75 };
const DESIGN: Frame = { x: 0, y: 85, w: 838, h: 634 };
const BUILD: Frame = { x: 858, y: 95, w: 270, h: 480 };
const OUTPUT: Frame = { x: 1165, y: 95, w: 280, h: 600 };

// Every stage card shares one box, wide enough for two lines of Generate's text.
const CARD_W = 230;
const CARD_H = 78;
// The smaller views set their cards 15% smaller, and the shared box shrinks with them.
const COMPACT_W = 196;
const COMPACT_H = 68;

const pct = (n: number) => `${+(n * 100).toFixed(3)}%`;

/** Place a box at board units inside `f`. */
function at(
  f: Frame,
  x: number,
  y: number,
  w: number,
  h?: number,
): CSSProperties {
  return {
    "--l": pct(x / f.w),
    "--t": pct(y / f.h),
    "--w": pct(w / f.w),
    // Set even when unsized: custom properties inherit, and a frame's --h would leak in.
    "--h": h === undefined ? "auto" : pct(h / f.h),
  } as CSSProperties;
}

function frame(f: Frame): CSSProperties {
  return at(BOARD, f.x, f.y, f.w, f.h);
}

/** The dark set's size and its offset from the light art, in the light file's pixels. */
const DARK: Record<string, { w: number; h: number; dx?: number; dy?: number }> =
  {
    "background-platform-tree.svg": { w: 900, h: 618, dx: -87, dy: -7 },
    "build-test-lab.svg": { w: 222, h: 175, dx: 5, dy: 3 },
    "generate-sequence-chain.svg": { w: 293, h: 320, dx: -15, dy: 4 },
    "generate-robotic-arm.svg": { w: 170, h: 202, dx: -1 },
    "learn-training-plot.svg": { w: 107, h: 76, dy: 2 },
    "learn-neural-network.svg": { w: 127, h: 123, dx: -1, dy: -2 },
    "select-funnel.svg": { w: 138, h: 163, dx: 4, dy: -1 },
    "learn-your-data-card.svg": { w: 255, h: 110, dx: -1, dy: 17 },
  };

/** One illustration in both themes; placed art is a light-sized box with the dark file inside. */
function Art({
  file,
  w,
  h,
  alt = "",
  pd,
  className = "",
  style,
}: {
  file: string;
  w: number;
  h: number;
  alt?: string;
  pd?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const d = DARK[file] ?? { w, h };
  const light = (
    <Image
      src={`${DIR}/${file}`}
      width={w}
      height={h}
      alt={alt}
      data-pd={style ? undefined : pd}
      className={`pd-img pd-light ${style ? "" : className}`}
    />
  );
  const dark = (
    <Image
      src={`${DIR}/dark/${file}`}
      width={d.w}
      height={d.h}
      alt={alt}
      data-pd={style ? undefined : pd}
      className={`pd-img pd-dark ${style ? "" : className}`}
      style={
        style
          ? {
              left: pct((d.dx ?? 0) / w),
              top: pct((d.dy ?? 0) / h),
              width: pct(d.w / w),
            }
          : undefined
      }
    />
  );
  if (!style) {
    return (
      <>
        {light}
        {dark}
      </>
    );
  }
  return (
    <span
      className={`pd-art ${className}`}
      style={{ ...style, aspectRatio: `${w} / ${h}` }}
      data-pd={pd}
    >
      {light}
      {dark}
    </span>
  );
}

function Label({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={`pd-label ${className}`} style={style}>
      {children}
    </p>
  );
}

const STAGES = [
  {
    id: "generate",
    title: "Generate",
    text: "Design new sequences de novo or by mutating a starting one",
    note: "Novel Variants",
    art: {
      file: "generate-novel-variant-cards.svg",
      w: 176,
      h: 85,
      alt: "Three generated antibody variant sequences, each with a score bar",
    },
    place: {
      note: [72, 44, 176],
      art: [72, 66, 176],
      card: [45, 184, CARD_W, CARD_H],
    },
  },
  {
    id: "predict",
    title: "Predict",
    text: "Model structure, function and fitness",
    art: {
      file: "predict-computer.svg",
      w: 189,
      h: 146,
      alt: "A monitor showing predicted properties beside a protein structure",
    },
    place: { art: [331, 48, 160], card: [304, 184, CARD_W, CARD_H] },
  },
  {
    id: "select",
    title: "Select",
    text: "Prioritize promising variants",
    art: {
      file: "select-funnel.svg",
      w: 142,
      h: 163,
      alt: "A funnel narrowing many candidates to a ranked shortlist",
    },
    place: { art: [606, 27, 126], card: [563, 184, CARD_W, CARD_H] },
  },
  {
    id: "train",
    title: "Train",
    text: "Learn from every round of lab results",
    note: "Learn",
    art: {
      file: "learn-neural-network.svg",
      w: 127,
      h: 122,
      alt: "A neural network",
    },
    place: {
      note: [700, 300, 112],
      art: [612, 319, 132],
      card: [563, 456, CARD_W, CARD_H],
    },
  },
] as const;

const OUTPUTS = [
  ["activity", "Activity", 72, 60],
  ["developability", "Developability", 64, 59],
  ["thermostability", "Thermostability", 60, 61],
  ["binding-affinity", "Binding affinity", 62, 58],
  ["expression", "Expression", 68, 33],
  ["specificity", "Specificity", 62, 57],
  ["solubility", "Solubility", 60, 54],
  ["and-more", "… and more", 61, 59],
] as const;

type View = "full" | "design" | "stages";

/** Each view is a window onto the board, in board units, with its own labels. */
const VIEWS: Record<View, { box: Frame; label: string; description: string }> = {
  full: {
    box: BOARD,
    label: "Platform diagram",
    description:
      "The iterative design loop on OpenProtein.AI. Foundation models generate, predict and select variants; you build and test them in the lab, and every round of results trains the models for the next, converging on variants optimized for the properties you choose.",
  },
  design: {
    box: { x: 0, y: DESIGN.y, w: BUILD.x + BUILD.w + 12, h: DESIGN.h },
    label: "Design and build–test diagram",
    description:
      "The design loop: foundation models generate, predict and select variants, you build and screen them in the lab, and every round of results trains the models for the next.",
  },
  stages: {
    box: { x: 19, y: 105, w: 800, h: 250 },
    label: "Generate, predict and select diagram",
    description:
      "Generate new sequences, predict their structure, function and fitness, and select the most promising variants to test.",
  },
};

/** Sizes the window and its board; the board keeps 16 units to the em in every view. */
function windowStyle({ x, y, w, h }: Frame): {
  canvas: CSSProperties;
  board: CSSProperties;
} {
  return {
    canvas: {
      "--pd-ar": `${w} / ${h}`,
      "--pd-arn": w / h,
      "--pd-wu": w / 16,
      "--pd-min": `calc(42.5rem * ${+(w / BOARD.w).toFixed(4)})`,
    } as CSSProperties,
    board: {
      left: pct(-x / w),
      top: pct(-y / h),
      width: pct(BOARD.w / w),
      height: pct(BOARD.h / h),
    },
  };
}

/** The design–build–test–learn loop: real text and code-drawn arrows over the illustration set. */
export function PlatformDiagram({ view = "full" }: { view?: View }) {
  const v = VIEWS[view];
  const style = windowStyle(v.box);
  const full = view === "full";
  const panel = view !== "stages";
  const stages = panel ? STAGES : STAGES.filter((s) => s.id !== "train");

  return (
    <figure
      className={`pd not-prose ${full ? "" : "pd-compact"}`}
      aria-label={v.description}
    >
      <PlatformDiagramZoom label={v.label} zoom={full}>
        <div className="pd-canvas" style={style.canvas}>
          <div className="pd-board" style={style.board}>
            {full ? (
              <section
                className="pd-frame"
                style={frame(INPUTS)}
                aria-label="Inputs"
                data-pd="inputs"
              >
                <div
                  className="pd-input pd-at"
                  style={at(INPUTS, 30, 0, 200)}
                  data-pd="in-settings"
                >
                  <p className="pd-input-name">Design settings</p>
                  <Art
                    file="input-design-settings.svg"
                    w={132}
                    h={50}
                    pd="in-settings-img"
                    alt="Sliders and toggles for design settings"
                  />
                </div>
                <div
                  className="pd-input pd-at"
                  style={at(INPUTS, 250, 0, 200)}
                  data-pd="in-parental"
                >
                  <p className="pd-input-name">Your parental sequence</p>
                  <Art
                    file="input-parental-sequence.svg"
                    w={130}
                    h={20}
                    pd="in-parental-img"
                    alt="A parental protein sequence"
                  />
                </div>
              </section>
            ) : null}

            <section
              className={`pd-frame ${panel ? "pd-design" : "pd-bare"}`}
              style={frame(DESIGN)}
              aria-label="Design"
              data-pd="design"
            >
              {panel ? (
                <>
                  <Art
                    file="background-platform-tree.svg"
                    w={811}
                    h={615}
                    className="pd-tree pd-at"
                    style={at(DESIGN, 27, 4, 811)}
                  />
                  <Label className="pd-at" style={at(DESIGN, 45, 20, 120)}>
                    Design
                  </Label>
                </>
              ) : null}

              <ol className="pd-stages">
                {stages.map((s) => {
                  const place = s.place as Record<
                    string,
                    readonly [number, number, number, number?]
                  >;
                  return (
                    <li key={s.id}>
                      {"note" in s ? (
                        <Label
                          className={`pd-at pd-note-${s.id}`}
                          style={at(DESIGN, ...place.note)}
                        >
                          {s.note}
                        </Label>
                      ) : null}
                      <Art
                        file={s.art.file}
                        w={s.art.w}
                        h={s.art.h}
                        alt={s.art.alt}
                        pd={`${s.id}-img`}
                        className="pd-at"
                        style={at(DESIGN, ...place.art)}
                      />
                      <div
                        className="pd-card pd-at"
                        style={
                          full
                            ? at(DESIGN, ...place.card)
                            : at(
                                DESIGN,
                                place.card[0] + (CARD_W - COMPACT_W) / 2,
                                place.card[1],
                                COMPACT_W,
                                COMPACT_H,
                              )
                        }
                        data-pd={`${s.id}-card`}
                      >
                        <p className="pd-card-title">{s.title}</p>
                        <p className="pd-card-text">{s.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {panel ? (
                <>
                  <div aria-hidden>
                    <Art
                      file="generate-sequence-chain.svg"
                      w={282}
                      h={327}
                      pd="chain"
                      className="pd-at"
                      style={at(DESIGN, 177, 152, 282)}
                    />
                    <Art
                      file="generate-robotic-arm.svg"
                      w={169}
                      h={201}
                      pd="arm"
                      className="pd-at"
                      style={at(DESIGN, 24, 333, 169)}
                    />
                    <Art
                      file="generate-bead-basket.svg"
                      w={132}
                      h={80}
                      className="pd-at"
                      style={at(DESIGN, 109, 465, 132)}
                    />
                    <Art
                      file="learn-training-plot.svg"
                      w={107}
                      h={78}
                      className="pd-at"
                      style={at(DESIGN, 441, 340, 107)}
                    />
                  </div>

                  <div
                    className="pd-foundation pd-at"
                    style={at(DESIGN, 0, 571, 838, 63)}
                  >
                    <Art
                      file="foundation-models-roots.svg"
                      w={344}
                      h={64}
                      className="pd-roots"
                    />
                    <p className="pd-foundation-title">Foundation models</p>
                    <p className="pd-foundation-text">
                      A shared base that powers generation, prediction,
                      selection and learning
                    </p>
                  </div>
                </>
              ) : null}
            </section>

            {panel ? (
              <section
                className="pd-frame"
                style={frame(BUILD)}
                aria-label="Build – Test"
                data-pd="build"
              >
                <div
                  className="pd-head pd-at"
                  style={at(BUILD, 7, 9, 240)}
                  data-pd="build-head"
                >
                  <Label>Build – Test</Label>
                  <p className="pd-head-title">Screen</p>
                  <p className="pd-head-text">
                    Build and measure in the laboratory
                  </p>
                </div>
                <Art
                  file="build-test-lab.svg"
                  w={258}
                  h={184}
                  alt="A scientist synthesizing and assaying variants at a microscope"
                  pd="lab"
                  className="pd-at"
                  style={at(BUILD, 6, 114, 258)}
                />
                <Art
                  file="learn-your-data-card.svg"
                  w={255}
                  h={126}
                  alt="Your data: a table of sequences with their assay readouts"
                  pd="data"
                  className="pd-at"
                  style={at(BUILD, 5, 383, 255)}
                />
                {/* The dark card file leaves out its caption, so the page supplies it. */}
                <p
                  className="pd-data-label pd-at"
                  style={at(BUILD, 5, 386, 120)}
                >
                  Your Data
                </p>
              </section>
            ) : null}

            {full ? (
              <section
                className="pd-frame"
                style={frame(OUTPUT)}
                aria-label="Output"
                data-pd="output"
              >
                <div
                  className="pd-head pd-at"
                  style={at(OUTPUT, 5, 9, 275)}
                  data-pd="output-head"
                >
                  <Label>Output</Label>
                  <p className="pd-head-title">Optimized variants</p>
                  <p className="pd-head-text">
                    Experimentally validated and optimized for whichever
                    properties you choose
                  </p>
                </div>
                <ul
                  className="pd-properties pd-at"
                  style={at(OUTPUT, 10, 110, 270, 490)}
                >
                  {OUTPUTS.map(([file, name, w, h]) => (
                    <li key={file}>
                      <Art
                        file={`output-icon-${file}.svg`}
                        w={w}
                        h={h}
                        className={`pd-icon-${file}`}
                      />
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <PlatformDiagramArrows />
          </div>
        </div>
      </PlatformDiagramZoom>
    </figure>
  );
}

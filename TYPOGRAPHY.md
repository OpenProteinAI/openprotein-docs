# Typography

One type scale for the whole site: docs pages, the reference pages, `/models`, the home page,
the editor. Every font size comes from it. A size that isn't a step on the scale is a bug.

The scale lives in `app/global.css` (the `@theme` block under the weight remap) and is closed,
so `text-4xl` or any other step outside it produces no CSS at all.

Nothing is sized in `px`. Type and everything around it is in `rem` or `em`, so the whole site
grows and shrinks with the reader's browser text size. See [Units](#units).

## Families

| family | variable | used for | weights |
|---|---|---|---|
| Object Sans | `--font-sans` (`font-sans`) | everything that isn't code | 400 regular, 500 medium |
| Roboto Mono | `--font-mono` (`font-mono`) | code blocks, inline code, identifiers, numbers in code | 400, 500 for emphasis |

Both load in `app/layout.tsx`. Object Sans ships 100, 400, 500 and 800 only, so **never
write `font-weight: 600` or `700`**: both fall through to Heavy. `font-semibold` and
`font-bold` are remapped to 500 and are safe. Italic is for the page lead and `<em>` only.

## The scale

The root font size is the browser's own (16px unless the reader changed it); the site never sets
it. The "at 16px" column is only for reading designs against.

| step | size | line height | at 16px | Tailwind | CSS |
|---|---|---|---|---|---|
| `2xs` | 0.6875rem | 16 / 11 | 11 / 16 | `text-2xs` | `var(--text-2xs)` |
| `xs` | 0.75rem | 16 / 12 | 12 / 16 | `text-xs` | `var(--text-xs)` |
| `sm` | 0.8125rem | 20 / 13 | 13 / 20 | `text-sm` | `var(--text-sm)` |
| `base` | 0.875rem | 22 / 14 | 14 / 22 | `text-base` | `var(--text-base)` |
| `lg` | 1rem | 22 / 16 | 16 / 22 | `text-lg` | `var(--text-lg)` |
| `xl` | 1.125rem | 24 / 18 | 18 / 24 | `text-xl` | `var(--text-xl)` |
| `2xl` | 1.375rem | 28 / 22 | 22 / 28 | `text-2xl` | `var(--text-2xl)` |
| `3xl` | 1.75rem | 34 / 28 | 28 / 34 | `text-3xl` | `var(--text-3xl)` |

Line heights are unitless ratios, so they follow the size: `var(--text-<step>--line-height)`.
Three more tokens:

| token | value | Tailwind | use |
|---|---|---|---|
| `--leading-prose` | 1.7 | `leading-prose` | running text: body copy, the page lead, notebook prose, long blurbs |
| `--tracking-caps` | 0.08em | `tracking-caps` | every uppercase label |
| `--tracking-tight` | -0.025em | `tracking-tight` | titles at `2xl` and `3xl` |

`<body>` is `base` on its own line height, so a component that sets nothing is already right.

## What to use where

| role | step | weight | extras |
|---|---|---|---|
| Home hero, 404 title | `3xl` | 500 | `tracking-tight` |
| Page title (h1), home section titles, `/models` title | `2xl` | 500 | `tracking-tight` |
| Section heading (h2) | `xl` | 500 | |
| Subsection heading (h3), feature-card title (model cards) | `lg` | 500 | |
| Minor heading (h4 to h6) | `base` | 500 | |
| Body copy, lists, callout text inside prose | `base` | 400 | `leading-prose` |
| Page lead (the description under the title) | `base` | 400 | italic, `--color-fd-description`, `leading-prose` |
| UI text: buttons, inputs, menus, tabs, header nav, breadcrumbs, search results, tooltips, card descriptions | `sm` | 400, 500 for buttons | |
| Card and callout titles | `sm` | 500 | |
| Large button (`size="lg"`) | `base` | 500 | |
| Tables (MDX, notebook prose, reference) | `sm` | 400 | `tabular-nums` |
| Rails: sidebar, TOC, page actions under the TOC; captions, meta, notebook DataFrames | `xs` | 400 | |
| Uppercase label: sidebar group headers, table heads, search groups, REST section labels, footer column heads, card labels | `2xs` | 500 | `uppercase tracking-caps` |
| Badges, chips, counts | `2xs` | 500 | |
| Code block, notebook stream output | `sm` | 400 | mono |
| Notebook execution counts, output summaries | `xs` | 400 | mono |
| Inline code | `0.875em` | 400 | mono; relative, so it follows the text around it |

Code is one step under the text it sits in: Roboto Mono is wider than Object Sans and has a
taller x-height, so at the same size it reads larger. A code identifier that *is* a heading
(Python API member names, REST endpoint paths) takes that heading's step, set in mono.

The uppercase label is one recipe everywhere. In TSX:

```tsx
<p className="text-2xs font-medium tracking-caps text-fd-muted-foreground uppercase">Section</p>
```

## Rules

1. **Only steps.** TSX uses `text-2xs` to `text-3xl`. CSS uses `var(--text-*)` and sets the
   matching `var(--text-*--line-height)` alongside. No raw font sizes (`font-size: 0.8rem`,
   `text-[0.8rem]`): arbitrary values still compile, so the closed scale can't catch them.
2. **Inherit first.** Set a size only when the role differs from the parent's. Most components
   need none.
3. **Running text gets `leading-prose`**, everything else the step's own line height.
4. **Tracking is for two cases only**: `tracking-caps` on uppercase, `tracking-tight` on titles
   at `2xl` and up.
5. **fumadocs follows the scale through its classes.** It compiles against our theme, so its
   `text-sm` is our 13px. Where it hard-codes a size, `app/global.css` pins it to a step: the
   tab panel and accordion bodies (15px in fumadocs), the code block (13px). After upgrading
   `fumadocs-ui` or `fumadocs-openapi`, look for new ones:

   ```bash
   grep -rhoE 'text-\[[0-9.]+(px|rem|em)\]' node_modules/fumadocs-ui/dist node_modules/fumadocs-openapi/dist | sort | uniq -c
   ```

## Units

**No `px`.** Sizing is bound to the font size, so a reader who sets a larger browser text size
gets a larger site, not larger text crammed into the same boxes.

| unit | for | examples |
|---|---|---|
| `rem` | everything that is a size: type, spacing, padding, gaps, control heights, widths, radii, icon sizes, layout widths, breakpoints, container queries | `min-h-8` (2rem), `--fd-sidebar-width: 17.125rem`, `min-[81.25rem]:flex` |
| `em` | sizes that belong to the text they sit in | inline code `0.875em`, `--tracking-caps: 0.08em`, the `op-btn` radius `0.75em` |
| unitless | line height | `1.7`, `calc(22 / 14)` |
| `px` | hairlines only: border and outline widths, outline offsets, box-shadows, blur, and a 1px offset that cancels a border (`top: -1px`) | `border: 1px solid …`, `shadow-[0_1px_2px_…]` |

A design value converts as `px / 16`: 7px is `0.4375rem`, 274px `17.125rem`. That renders the
same at the default root and scales with the reader's. Prefer a Tailwind step where one exists
(`p-2` is `0.5rem`) over an arbitrary value.

Hairlines stay `px` so a divider is one line at any text size. Three things are `px` because
they can't be anything else: sizes JavaScript measures and writes back
(`--om-tools-height: ${height}px`), Radix props that take pixel numbers (`sideOffset`,
`collisionPadding`), and an image's intrinsic `width`/`height` attributes.

## Vertical alignment

### The problem

Object Sans' vertical metrics don't centre its capitals. A browser places the baseline
`(ascent − descent) / 2` below the middle of the line box. Capitals sit centred only when
`ascent − descent` equals the cap height. Object Sans' don't, and its weights don't even agree
with each other:

| face | ascent | descent | ascent − descent | cap height | caps sit |
|---|---|---|---|---|---|
| Regular (macOS, `hhea`) | 0.735 | 0.230 | 0.505 | 0.705 | 0.100em high |
| Medium (macOS, `hhea`) | 0.970 | 0.330 | 0.640 | 0.708 | 0.034em high |
| Regular (Windows, `win`) | 1.040 | 0.270 | 0.770 | 0.705 | 0.033em low |

Regular centres its *x-height* (0.505), not its capitals. That is the uneven gap above and below
a label, about 1.4px at 14px. It used to be patched by hand, per component and per weight:
`--caps-drop` translates, `pt-[7px] pb-[5px]` on the header pills, `translate-y` on the logo.

### The fix

`app/layout.tsx` overrides the metrics on every Object Sans face:

```ts
declarations: [
  { prop: 'ascent-override', value: '95.5%' },
  { prop: 'descent-override', value: '25%' },
  { prop: 'line-gap-override', value: '0%' },
],
```

`0.955 − 0.25 = 0.705`, Regular's cap height, so capitals land in the middle of any line box,
for every weight and on every OS, in Chrome, Edge and Firefox. The descent of 0.25 covers the deepest descender (`g` reaches
−0.25), and the ascent covers ascenders and accents. The faces' cap heights run 0.701 to
0.716, so one override is within 0.006em (under 0.1px at 14px) for all of them.

Measured in Chrome after the fix: the header pills, buttons and menu rows are centred to within
0.08px. Before, they were 0.43px to 1.4px high.

### Rules for components

- **Centre text with layout**: `items-center` and symmetric padding. Never nudge text with
  `translate-y`, uneven `pt-*`/`pb-*` or a margin. If a label looks off, the fix is upstream,
  not in the component.
- **For text flush to an edge** (a badge whose padding should equal the visible gap, or a
  heading aligned to the top of an image), use `text-box: trim-both cap alphabetic`. Put it on
  the element holding the text, not on a flex container, since `text-box-trim` applies only to
  block containers and inline boxes. Chrome 133, Safari 18.2 and Firefox 154 support it.
- **Safari doesn't support the overrides yet** (Technology Preview only), so it renders the
  native metrics: Regular capitals 0.1em high, as before the fix. Don't add Safari-only nudges.
  It resolves itself when Safari ships the descriptors.
- **The fallback face** next/font generates (Arial, sized to match) keeps the native metrics.
  It only shows while the web font loads.
- **Replacing a font file** means re-measuring it and updating the overrides:

  ```bash
  python3 -c "import sys; from fontTools.ttLib import TTFont
  for p in sys.argv[1:]:
      f = TTFont(p); u = f['head'].unitsPerEm; h = f['hhea']; o = f['OS/2']
      print(p, 'ascent', h.ascent / u, 'descent', -h.descent / u, 'cap', o.sCapHeight / u)" app/fonts/*
  ```

## Exceptions

Only these sit off the scale, each for a reason:

- **The logo lockup** (`components/site/logo.tsx`): the "Docs" label is `0.875rem` and
  `1.3125rem`, sized to the wordmark's cap height in the SVG, not to the text around it.
- **Math toolbar glyphs** (`components/editor/math-toolbar.tsx`): MathJax faces used as icons,
  each sized to fill its button. Their text labels are on the scale.
- **Relative sizes**: inline code (`0.875em`), `<sub>`, `<sup>` and `<kbd>` scale with their
  context on purpose.

## Checking

Raw font sizes in source should only turn up the exceptions above:

```bash
grep -rnE 'font-size: *[0-9]|fontSize|text-\[[0-9.]+(px|rem)\]' app components lib --include='*.css' --include='*.tsx' --include='*.ts'
```

`px` outside hairlines, comments and measured values should print nothing:

```bash
grep -rnE '[0-9.]+px' app components lib --include='*.css' --include='*.tsx' --include='*.ts' \
  | grep -vE 'border|outline|shadow|blur|rgb\(|#000|1px|/\*|//|:[0-9]+: *\*|\$\{'
```

To list every rendered size that isn't on the scale at the default 16px root, paste this into
the console on any page:

```js
const scale = new Set([11, 12, 13, 14, 16, 18, 22, 28]);
const off = new Map();
for (const el of document.querySelectorAll('body *')) {
  if (!el.checkVisibility() || el.closest('mjx-container')) continue;
  if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
  const fs = +parseFloat(getComputedStyle(el).fontSize).toFixed(2);
  if (!scale.has(fs)) off.set(fs, [...(off.get(fs) ?? []), el]);
}
off;
```

Expect only inline code, sub and sup, and the footer logo.

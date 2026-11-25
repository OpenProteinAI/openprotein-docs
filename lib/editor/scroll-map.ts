/** A preview block: the source lines it came from and where it sits in the scroller. */
export interface Block {
  start: number;
  end: number;
  top: number;
  bottom: number;
}

/** Reads `[data-block]` wrappers, measured in `scroller` content coordinates. */
export function measureBlocks(scroller: HTMLElement): Block[] {
  const origin = scroller.getBoundingClientRect().top - scroller.scrollTop;
  const blocks: Block[] = [];
  for (const node of scroller.querySelectorAll<HTMLElement>('[data-block]')) {
    const boxes = getComputedStyle(node).display === 'contents' ? Array.from(node.children) : [node];
    if (!boxes.length) continue;
    const top = Math.min(...boxes.map((box) => box.getBoundingClientRect().top)) - origin;
    const bottom = Math.max(...boxes.map((box) => box.getBoundingClientRect().bottom)) - origin;
    if (bottom <= top) continue;
    blocks.push({ start: Number(node.dataset.start), end: Number(node.dataset.end), top, bottom });
  }
  return blocks.sort((a, b) => a.start - b.start);
}

/** The block a line belongs to, else the last one above it. */
export function blockAt(blocks: Block[], line: number): Block | null {
  let found: Block | null = null;
  for (const block of blocks) {
    if (block.start > line) break;
    found = block;
  }
  return found;
}

/** Fractional source line to preview y. */
export function lineToY(blocks: Block[], line: number): number {
  let previous: Block | null = null;
  for (const block of blocks) {
    if (line < block.start) {
      if (!previous) return block.top * Math.max(0, line - 1) / Math.max(1, block.start - 1);
      const span = block.start - (previous.end + 1);
      const t = span > 0 ? (line - (previous.end + 1)) / span : 0;
      return previous.bottom + (block.top - previous.bottom) * t;
    }
    if (line < block.end + 1) {
      return block.top + (block.bottom - block.top) * ((line - block.start) / (block.end + 1 - block.start));
    }
    previous = block;
  }
  return previous ? previous.bottom : 0;
}

/** Preview y to fractional source line. */
export function yToLine(blocks: Block[], y: number): number {
  let previous: Block | null = null;
  for (const block of blocks) {
    if (y < block.top) {
      if (!previous) return 1 + (block.start - 1) * (block.top ? y / block.top : 0);
      const gap = block.top - previous.bottom;
      const t = gap > 0 ? (y - previous.bottom) / gap : 0;
      return previous.end + 1 + (block.start - (previous.end + 1)) * t;
    }
    if (y < block.bottom) {
      return block.start + (block.end + 1 - block.start) * ((y - block.top) / (block.bottom - block.top));
    }
    previous = block;
  }
  return previous ? previous.end + 1 : 1;
}

import type { Element, ElementContent, Root } from 'hast';
import { h, s } from 'hastscript';

export { default as remarkMath } from 'remark-math';

export interface MathPosition {
  start: { line: number; column: number; offset?: number };
  end: { line: number; column: number; offset?: number };
}

export interface MathFailure {
  tex: string;
  display: boolean;
  message: string;
  position?: MathPosition;
}

export type TexToHast = (tex: string, display: boolean) => Promise<{ node: Element; error: string | null }>;

export interface RehypeMathOptions {
  /** Lazy, for the editor. */
  load: () => Promise<TexToHast>;
  /** Else a TeX error fails the file. */
  fallback?: (failure: MathFailure) => ElementContent;
}

interface FileLike {
  data: object;
  fail(reason: string, place?: MathPosition): never;
}

/** Equations `fallback` replaced. */
export function mathFailures(file: { data: object }): MathFailure[] {
  const data = file.data as { mathFailures?: MathFailure[] };
  return (data.mathFailures ??= []);
}

type Parent = { children: ElementContent[] };

function isMath(node: ElementContent): node is Element {
  if (node.type !== 'element' || node.tagName !== 'code') return false;
  const names = node.properties.className;
  return Array.isArray(names) && names.includes('language-math');
}

function textOf(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  return node.type === 'element' ? node.children.map(textOf).join('') : '';
}

/** remark-math's TeX through MathJax. */
export function rehypeMath({ load, fallback }: RehypeMathOptions) {
  return async (tree: Root, file: FileLike) => {
    const found: { parent: Parent; index: number; target: Element; code: Element; display: boolean }[] = [];
    const walk = (parent: Parent) => {
      parent.children.forEach((child, index) => {
        if (child.type !== 'element') return;
        const only = child.tagName === 'pre' && child.children.length === 1 ? child.children[0] : null;
        if (only && isMath(only)) found.push({ parent, index, target: child, code: only, display: true });
        else if (isMath(child)) {
          const names = child.properties.className as string[];
          found.push({ parent, index, target: child, code: child, display: names.includes('math-display') });
        } else walk(child);
      });
    };
    walk(tree as unknown as Parent);
    if (!found.length) return;

    const convert = await load();
    for (const { parent, index, target, code, display } of found) {
      const tex = textOf(code).replace(/\n$/, '');
      const { node, error } = await convert(tex, display);
      // For the editor's block markers.
      const place = target.position ?? code.position;
      if (!error) {
        parent.children[index] = { ...node, position: place };
        continue;
      }
      const position = place as MathPosition | undefined;
      if (!fallback) file.fail(`TeX error: ${error}, in ${display ? '$$' : '$'}${tex}${display ? '$$' : '$'}`, position);
      const failure = { tex, display, message: error, position };
      mathFailures(file).push(failure);
      parent.children[index] = { ...fallback(failure), position: place } as ElementContent;
    }
  };
}

const ALERT = () =>
  s('svg', { className: ['op-math-error__icon'], viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
    s('circle', { cx: 12, cy: 12, r: 10 }),
    s('path', { d: 'M12 8v4M12 16h.01' }),
  ]);

export function mathErrorBox({ tex, display, message }: MathFailure): Element {
  if (!display) {
    return h('span', { className: ['op-math-error'], dataInline: '', role: 'note', title: message }, [
      ALERT(),
      h('code', tex),
    ]);
  }
  return h('div', { className: ['op-math-error'], role: 'note' }, [
    h('span', { className: ['op-math-error__message'] }, [ALERT(), message]),
    h('code', tex),
  ]);
}

/** The named command, else the equation. */
export function errorRange(source: string, message: string): [number, number] {
  const command = /\\[A-Za-z]+|\\./.exec(message)?.[0];
  if (command) {
    const at = new RegExp(`${command.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?![A-Za-z])`).exec(source);
    if (at) return [at.index, at.index + command.length];
  }
  const inner = /^(\$+)([\s\S]*?)\1$/.exec(source.trimEnd());
  if (!inner) return [0, source.length];
  const lead = inner[1].length + (/^\s*/.exec(inner[2])?.[0].length ?? 0);
  const trail = inner[1].length + (/\s*$/.exec(inner[2])?.[0].length ?? 0);
  return lead < source.trimEnd().length - trail ? [lead, source.trimEnd().length - trail] : [0, source.length];
}

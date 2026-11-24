import { icons } from 'lucide-react';
import { splitDoc } from './doc';

const LUCIDE_IMPORT = /^import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"];?[ \t]*$/m;

/** Local names every import line declares. */
function declared(body: string): Set<string> {
  const names = new Set<string>();
  for (const [, list] of body.matchAll(/^import\s*\{([^}]*)\}/gm)) {
    for (const part of list.split(',')) {
      const local = part.trim().split(/\s+as\s+/).pop();
      if (local) names.add(local);
    }
  }
  for (const [, name] of body.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s+from/gm)) names.add(name);
  return names;
}

/** Imports the Lucide icons used as JSX, so the published page builds. Adds, never removes. */
export function addIconImports(source: string, reserved: ReadonlySet<string>): string {
  const { yaml, body } = splitDoc(source);
  const head = source.slice(0, source.length - body.length);
  // Code samples may show icon JSX without using it.
  const prose = body.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
  const have = declared(body);
  const missing = new Set<string>();
  for (const [, name] of prose.matchAll(/<([A-Z][A-Za-z0-9]*)(?=[\s/>])/g)) {
    if (Object.hasOwn(icons, name) && !reserved.has(name) && !have.has(name)) missing.add(name);
  }
  if (!missing.size) return source;

  const existing = LUCIDE_IMPORT.exec(body);
  if (existing) {
    const names = [...existing[1].split(',').map((part) => part.trim()).filter(Boolean), ...missing];
    const line = `import { ${names.join(', ')} } from 'lucide-react';`;
    return head + body.slice(0, existing.index) + line + body.slice(existing.index + existing[0].length);
  }
  const line = `import { ${[...missing].join(', ')} } from 'lucide-react';`;
  return `${head}${yaml !== null ? '\n' : ''}${line}\n\n${body.replace(/^\s*\n/, '')}`;
}

import type { ReactNode } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { MethodLabel } from '@/components/rest-api/method-label';
import { API_ROOT } from './env';
import {
  buildEndpointTree,
  type EndpointOperation,
  type EndpointSection,
  type EndpointTree,
  type SpecDocument,
} from './openapi-endpoints';

/** Sections nest three deep on the embeddings spec (group / model / operation). */
const MAX_DEPTH = 4;

/** '/api/v1/fold/models' -> '/fold/models': the root is identical on every entry. */
function displayPath(path: string): string {
  const root = API_ROOT.replace(/\/$/, '');
  return root && path.startsWith(`${root}/`) ? path.slice(root.length) : path;
}

/** CSS offers no break opportunity at '/', so a long path would wrap mid-segment. */
function pathNodes(path: string): ReactNode[] {
  return path
    .split('/')
    .flatMap((segment, index) => (index === 0 ? [segment] : ['/', <wbr key={index} />, segment]));
}

function OperationLabel({ operation }: { operation: EndpointOperation }) {
  return (
    <span className="flex items-baseline gap-1.5">
      {/* shrink-0 + nowrap, or a long path breaks 'GET' across two lines. */}
      <MethodLabel method={operation.method} className="shrink-0 text-xs whitespace-nowrap" />
      <span className="min-w-0 font-mono text-xs break-words">
        {pathNodes(displayPath(operation.path))}
      </span>
    </span>
  );
}

function push(items: TOCItemType[], tree: EndpointTree | EndpointSection, depth: number): void {
  for (const operation of tree.operations) {
    items.push({
      title: <OperationLabel operation={operation} />,
      url: `#${operation.anchor}`,
      depth,
    });
  }
  for (const section of tree.sections) {
    items.push({ title: section.title, url: `#${section.anchor}`, depth });
    push(items, section, Math.min(depth + 1, MAX_DEPTH));
  }
}

export function endpointsTocFromTree(tree: EndpointTree): TOCItemType[] {
  const items: TOCItemType[] = [];
  push(items, tree, 2);
  return items;
}

export function endpointsToc(document: SpecDocument): TOCItemType[] {
  return endpointsTocFromTree(buildEndpointTree(document));
}

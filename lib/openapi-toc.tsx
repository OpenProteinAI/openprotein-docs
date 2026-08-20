import type { TOCItemType } from 'fumadocs-core/toc';
import {
  buildEndpointTree,
  type EndpointOperation,
  type EndpointSection,
  type EndpointTree,
  type SpecDocument,
} from './openapi-endpoints';

/** Sections nest three deep on the embeddings spec (group / model / operation). */
const MAX_DEPTH = 4;

function OperationLabel({ operation }: { operation: EndpointOperation }) {
  return (
    <span className="flex items-baseline gap-1.5">
      {/* shrink-0 + nowrap, or a long label breaks 'GET' across two lines. */}
      <span className="shrink-0 text-xs font-medium tracking-[0.04em] whitespace-nowrap uppercase text-fd-muted-foreground">
        {operation.method}
      </span>
      <span>{operation.label}</span>
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

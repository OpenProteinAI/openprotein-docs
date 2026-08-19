import { getPageTreePeers } from 'fumadocs-core/page-tree';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { source } from '@/lib/source';

/** Replaces <DocsCategory />, removed in fumadocs v16. */
export function SectionCards({ url }: { url: string }) {
  const peers = getPageTreePeers(source.getPageTree(), url);
  if (peers.length === 0) return null;

  return (
    <Cards>
      {peers.map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url} description={peer.description} />
      ))}
    </Cards>
  );
}

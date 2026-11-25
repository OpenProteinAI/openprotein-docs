import { getPageTreePeers } from 'fumadocs-core/page-tree';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { descriptionText } from '@/lib/description';
import { source } from '@/lib/source';

/** Replaces <DocsCategory />, removed in fumadocs v16. */
export function SectionCards({ url }: { url: string }) {
  const peers = getPageTreePeers(source.getPageTree(), url);
  if (peers.length === 0) return null;

  return (
    <Cards>
      {peers.map((peer) => (
        /* A card is one big link, so a description's own links come out as text - nesting
           anchors is invalid HTML and the inner one would swallow the card's click. */
        <Card
          key={peer.url}
          title={peer.name}
          href={peer.url}
          description={
            typeof peer.description === 'string'
              ? descriptionText(peer.description)
              : peer.description
          }
        />
      ))}
    </Cards>
  );
}

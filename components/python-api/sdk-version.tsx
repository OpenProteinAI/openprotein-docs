import { ExternalLink, Package } from 'lucide-react';
import { Button } from '@/components/site/button';
import { readPySdk } from '@/lib/python-api';

export async function PySdkVersion() {
  const { sdk: { package: name, version }, source } = await readPySdk();

  return (
    <Button
      variant="secondary"
      size="compact"
      href={source.branch ? `${source.repository}/tree/${source.ref}` : `https://pypi.org/project/${name}/${version}/`}
      title={source.branch ? `${name} ${version} at ${source.ref}` : undefined}
      external
      className="shrink-0 text-xs"
    >
      <Package className="size-3.5 shrink-0" />
      {source.branch ? `SDK ${source.branch}` : `${name} ${version}`}
      <ExternalLink aria-hidden className="size-3 shrink-0" />
    </Button>
  );
}

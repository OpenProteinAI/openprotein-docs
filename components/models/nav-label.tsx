import { ModelVersionsIcon } from '@/components/models/icons';

/** Name, then the app's version count. */
export function ModelNavLabel({ name, versions }: { name: string; versions: number }) {
  return (
    <>
      {name}
      {versions > 1 ? (
        <span className="om-nav-versions">
          <ModelVersionsIcon size={12} />
          {versions} versions
        </span>
      ) : null}
    </>
  );
}

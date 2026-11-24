import type { PyOverloadContract } from '@/lib/python-api';
import { TypeRef } from './type-ref';

export function Overloads({ name, overloads }: { name: string; overloads?: PyOverloadContract[] }) {
  if (!overloads?.length) return null;
  return (
    <div className="not-prose mt-1 flex flex-col gap-0.5">
      {overloads.map((overload, index) => (
        <div key={index} className="font-mono text-xs text-fd-muted-foreground">
          {name}<TypeRef parts={overload.signature_parts} fallback={overload.signature} className="" />
          {overload.returns ? <> → <TypeRef parts={overload.returns_parts} fallback={overload.returns} className="" /></> : null}
        </div>
      ))}
    </div>
  );
}

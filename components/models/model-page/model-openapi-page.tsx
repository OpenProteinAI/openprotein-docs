'use client';

import type { ReactNode } from 'react';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { EndpointRoot } from '@/components/rest-api/endpoint-list';
import { OPENAPI_PAGE_OPTIONS } from '@/components/rest-api/openapi-config';
import { endpointLabel } from '@/lib/model-endpoints';
import { endpointOperation, operationKey, type EndpointMethod } from '@/lib/openapi-endpoints';

/**
 * The REST reference's endpoint cards and playground, for the operations a model page hands it:
 * a flat list named by what each does ("Scoring").
 */
export const ModelOpenAPIPage = createOpenAPIPage({
  ...OPENAPI_PAGE_OPTIONS,

  content: {
    ...OPENAPI_PAGE_OPTIONS.content,

    renderPageLayout: (slots, ctx) => {
      const bodies = new Map<string, ReactNode>();
      const operations = (slots.operations ?? []).map(({ item, children }) => {
        bodies.set(operationKey(item.path, item.method), children);
        // The operations come from lib/model-api.ts, which only lists these methods.
        const operation = endpointOperation(ctx.schema.dereferenced, item.path, item.method as EndpointMethod);
        return { ...operation, label: endpointLabel(item.path) };
      });

      return (
        <EndpointRoot
          tree={{ operations, sections: [] }}
          depth={3}
          bodies={bodies}
          markdown={(md) => ctx._default_processMarkdown(md)}
        />
      );
    },
  },
});

'use client';

import { Fragment, type ReactNode } from 'react';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { EndpointRoot } from './rest-api/endpoint-list';
import { OPENAPI_PAGE_OPTIONS } from './rest-api/openapi-config';
import { buildEndpointTree, operationKey } from '@/lib/openapi-endpoints';

export const OpenAPIPage = createOpenAPIPage({
  ...OPENAPI_PAGE_OPTIONS,

  content: {
    ...OPENAPI_PAGE_OPTIONS.content,

    // Replaces the flat stack of expanded operations with the tag sections the old
    // Swagger UI grouped by, each endpoint collapsed until it is asked for.
    renderPageLayout: (slots, ctx) => {
      const bodies = new Map<string, ReactNode>();
      for (const entry of slots.operations ?? []) {
        bodies.set(operationKey(entry.item.path, entry.item.method), entry.children);
      }
      const webhooks = slots.webhooks ?? [];

      if (bodies.size === 0 && webhooks.length === 0) {
        return (
          <p className="text-sm text-fd-muted-foreground">
            This service publishes no endpoints yet.
          </p>
        );
      }

      return (
        <>
          <EndpointRoot
            tree={buildEndpointTree(ctx.schema.dereferenced)}
            depth={2}
            bodies={bodies}
            markdown={(md) => ctx._default_processMarkdown(md)}
          />
          {webhooks.map((entry) => (
            <Fragment key={`${entry.item.name}:${entry.item.method}`}>{entry.children}</Fragment>
          ))}
        </>
      );
    },
  },
});

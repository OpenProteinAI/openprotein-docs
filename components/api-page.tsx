'use client';

import { Fragment, type ReactNode } from 'react';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import {
  DefaultCollapsiblePanel,
  type CollapsiblePanelProps,
} from 'fumadocs-openapi/playground/client';
import { EndpointRoot } from './rest-api/endpoint-list';
import { buildEndpointTree, operationKey } from '@/lib/openapi-endpoints';

/** Keep in sync with lib/openapi.ts. */
const PROXY_URL = '/api/playground-proxy';

export const OpenAPIPage = createOpenAPIPage({
  // Suppresses only EXTRA per-endpoint generators (and any `x-codeSamples`). The seven
  // default languages stay registered in `codeUsages`; what actually removes the tabs is
  // dropping the `apiExample` slot below. Re-add that slot and all seven reappear.
  generateCodeSamples: () => [],

  components: {
    /**
     * Headings inside an expanded endpoint: "Request Body", "Response Body",
     * "Query Parameters". fumadocs wraps each in an anchor with a copy button, but the
     * ids are not unique down the page - every endpoint renders its own
     * `#request-body` - so the link they hand out points at whichever comes first. The
     * endpoint row's own Copy link button is the one that works.
     */
    Heading: ({ id, depth, className, children, ...props }) => {
      const Tag = `h${Math.min(depth + 1, 6)}` as 'h2';
      return (
        <Tag id={id} className={`scroll-mt-24 ${className ?? ''}`} {...props}>
          {children}
        </Tag>
      );
    },
  },

  content: {
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

    /**
     * One expanded endpoint. Three slots are dropped:
     *
     *  - `header` - the summary as a heading. The collapsed row is the endpoint's title
     *    and owns its anchor and its deprecation badge; a second heading underneath
     *    would compete for the same job.
     *  - `apiExample` - the pinned column of generated cURL / JavaScript / Go / Python
     *    snippets. Dropping it is what frees the gutter for the endpoint TOC.
     *  - `authSchemes` - a bearer token the reader cannot supply here: the auth inputs
     *    are removed below and /api/playground-proxy attaches the token server-side.
     */
    renderOperationLayout: (slots) => (
      <div className="min-w-0">
        {slots.apiPlayground}
        {slots.description}
        {slots.parameters}
        {slots.body}
        {slots.responses}
        {slots.callbacks}
      </div>
    ),
  },

  playground: {
    // This is the load-bearing lockdown: it empties `inputs` before the localStorage
    // writer, initAuthInputs() and mapInputs() run, so no bearer is ever stored or sent.
    transformAuthInputs: () => [],
    fetchOptions: {
      proxyUrl: PROXY_URL,
      // Must stay false. The default (true) sets `credentials: 'omit'` on the request to
      // our own proxy, so op_docs_session never arrives, getSession() is null and every
      // Send answers 401. It has nothing to do with leaking the cookie upstream - JS
      // cannot read an httpOnly cookie, and attach() deletes the header regardless.
      proxyForwardCookie: false,
      requestTimeout: false,
    },
    components: {
      // Cosmetic only - useAuthInputs runs in the parent whether or not this renders.
      CollapsiblePanel: (props: CollapsiblePanelProps) =>
        props['data-type'] === 'authorization' ? null : <DefaultCollapsiblePanel {...props} />,
    },
  },
});

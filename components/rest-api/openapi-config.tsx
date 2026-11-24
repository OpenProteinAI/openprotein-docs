import { useEffect } from 'react';
import type { createOpenAPIPage } from 'fumadocs-openapi/ui';
import {
  DefaultCollapsiblePanel,
  DefaultResultDisplay,
  type CollapsiblePanelProps,
  type ResultDisplayProps,
} from 'fumadocs-openapi/playground/client';
import { AUTH } from '@/lib/auth/config';
import { accessToken, getView, tokenRejected } from '@/lib/auth/session';
import { FileNaming, FileResult, fileNaming, isFileResponse } from './file-result';

type OpenAPIPageOptions = NonNullable<Parameters<typeof createOpenAPIPage>[0]>;

const SIGNED_OUT = 'Log in to run requests against the API.';
const UNREACHABLE = "Can't reach OpenProtein. Requests resume once it answers.";
const CHECKING = 'Checking your session. Send again in a moment.';

/** Already aborted: fetch rejects with this reason, and the result panel shows it. */
function refused(): AbortSignal {
  const session = getView();
  const why = session.status !== 'signed-in' ? SIGNED_OUT : session.resuming ? CHECKING : UNREACHABLE;
  return AbortSignal.abort(new DOMException(why, 'AbortError'));
}

function ResultDisplay(props: ResultDisplayProps) {
  const { data } = props;
  useEffect(() => {
    if (data.type === 'response' && data.status === 401) void tokenRejected();
  }, [data]);
  if (isFileResponse(data)) return <FileResult {...props} data={data} />;
  return <DefaultResultDisplay {...props} />;
}

/**
 * Everything both endpoint pages share — the REST reference (components/api-page.tsx) and the
 * model family pages — above all the playground lockdown. Only the page layout differs.
 */
export const OPENAPI_PAGE_OPTIONS = {
  // Suppresses only EXTRA per-endpoint generators (and any `x-codeSamples`). The seven
  // default languages stay registered in `codeUsages`; what actually removes the tabs is
  // dropping the `apiExample` slot below. Re-add that slot and all seven reappear.
  generateCodeSamples: () => [],

  // fumadocs restores a stored server URL without checking it against `servers`, so the key
  // names this build's API: a URL another build stored is never read.
  storageKeyPrefix: `op-docs-${AUTH.apiOrigin}-`,

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
    /**
     * One expanded endpoint. Three slots are dropped:
     *
     *  - `header` - the summary as a heading. The collapsed row is the endpoint's title
     *    and owns its anchor and its deprecation badge; a second heading underneath
     *    would compete for the same job.
     *  - `apiExample` - the pinned column of generated cURL / JavaScript / Go / Python
     *    snippets. Dropping it is what frees the gutter for the endpoint TOC.
     *  - `authSchemes` - a bearer token the reader cannot supply here: the auth inputs
     *    are removed below and onRequestInit attaches the docs token.
     */
    renderOperationLayout: (slots, { operation, pathItem }) => (
      <div className="min-w-0">
        {AUTH.enabled ? (
          <FileNaming value={fileNaming(operation, pathItem)}>{slots.apiPlayground}</FileNaming>
        ) : null}
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
    // writer, initAuthInputs() and mapInputs() run, so no bearer is stored, restored or
    // taken from an input.
    transformAuthInputs: () => [],
    fetchOptions: {
      requestTimeout: false,
      // The only place a bearer joins a request: the in-memory docs token, renewed first.
      onRequestInit: async (init) => {
        const token = await accessToken();
        if (!token) return { ...init, signal: refused() };
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return { ...init, headers, credentials: 'omit' };
      },
    },
    components: {
      ResultDisplay,
      // Cosmetic only - useAuthInputs runs in the parent whether or not this renders.
      CollapsiblePanel: (props: CollapsiblePanelProps) =>
        props['data-type'] === 'authorization' ? null : <DefaultCollapsiblePanel defaultOpen {...props} />,
    },
  },
} satisfies OpenAPIPageOptions;

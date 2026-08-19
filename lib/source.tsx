import { loader } from 'fumadocs-core/source';
import { statusBadgesPlugin } from 'fumadocs-core/source/plugins/status-badges';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod';

/** pageSchema plus the fields the custom renderers read. */
export const docsPageSchema = pageSchema.extend({
  notebook: z.string().optional(),
  pythonApi: z.string().optional(),
  status: z.string().optional(),
});

/** Without this a leaf <Card title=".." href=".." /> is indexed as raw JSX. */
const TEXT_ATTRIBUTES = new Set(['title', 'description', 'label', 'name']);

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsPageSchema,
    postprocess: { includeProcessedMarkdown: true },
    mdxOptions: applyMdxPreset({
      remarkStructureOptions: {
        stringify: {
          filterMdxAttributes: (_node, attribute) =>
            attribute.type === 'mdxJsxAttribute' && TEXT_ATTRIBUTES.has(attribute.name),
          // Leaf elements: emit attribute text, not JSX source.
          stringify: (node) => {
            if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
            if (node.children.length > 0) return;

            return node.attributes
              .flatMap((attribute) =>
                attribute.type === 'mdxJsxAttribute' &&
                TEXT_ATTRIBUTES.has(attribute.name) &&
                typeof attribute.value === 'string'
                  ? [attribute.value]
                  : [],
              )
              .join(' ');
          },
        },
      },
    }),
  },
  meta: { schema: metaSchema },
});

/** baseUrl '/' so routes match the old Sphinx URLs one-for-one. */
export const source = loader(
  { docs: docs.toFumadocsSource() },
  {
    baseUrl: '/',
    plugins: [
      statusBadgesPlugin({
        renderBadge: (status) => (
          <span className="ms-auto rounded-full border border-fd-border px-1.5 py-px text-xs font-medium tracking-[0.04em] uppercase text-[color:var(--brand-3-ink)]">
            {status}
          </span>
        ),
      }),
    ],
  },
);

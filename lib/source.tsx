import { loader } from 'fumadocs-core/source';
import { statusBadgesPlugin } from 'fumadocs-core/source/plugins/status-badges';
import type { StructureOptions } from 'fumadocs-core/mdx-plugins';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod';
import { descriptionText } from '@/lib/description';
import { rehypeMath, remarkMath } from '@/lib/math';
import { texToHast } from '@/lib/mathjax';

/** pageSchema plus the fields the custom renderers read. */
export const docsPageSchema = pageSchema.extend({
  notebook: z.string().optional(),
  // The body is the App version, `notebook` the Python one.
  duoContent: z.boolean().optional(),
  openapi: z.string().optional(),
  // A flag, not a value: the classes a page renders are declared inline with <PyClass>,
  // and a page can draw on several modules (embedding.mdx pulls from openprotein.embeddings,
  // .svd, .umap, .common and .embeddings.future). Typed boolean so nobody reads meaning
  // into a string that nothing consumes.
  pythonApi: z.boolean().optional(),
  status: z.string().optional(),
  // Sidebar, breadcrumb and prev/next label.
  sidebarTitle: z.string().optional(),
});

/** Search records as plain text: a record per table cell, JSX as its content. */
export const structureOptions = {
  types: ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  filterElement: () => false,
} satisfies StructureOptions;

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsPageSchema,
    postprocess: { includeProcessedMarkdown: true },
    mdxOptions: applyMdxPreset({
      remarkPlugins: [remarkMath],
      // Before shiki.
      rehypePlugins: (plugins) => [[rehypeMath, { load: async () => texToHast }], ...plugins],
      remarkStructureOptions: structureOptions,
    }),
  },
  meta: { schema: metaSchema },
});

/** baseUrl '/' so routes match the old Sphinx URLs one-for-one. */
export const source = loader(
  { docs: docs.toFumadocsSource() },
  {
    baseUrl: '/',
    // The prev/next cards print the tree's own description as plain text, so a description
    // with a markdown link would show the syntax. See lib/description.ts.
    pageTree: {
      transformers: [
        {
          file(node, path) {
            const file = path ? this.storage.read(path) : undefined;
            const name = file?.format === 'page' ? file.data.sidebarTitle : undefined;
            return {
              ...node,
              name: name ?? node.name,
              description:
                typeof node.description === 'string' ? descriptionText(node.description) : node.description,
            };
          },
        },
      ],
    },
    plugins: [
      statusBadgesPlugin({
        renderBadge: (status) => (
          <span className="ms-auto rounded-full border border-fd-border px-1.5 py-px text-2xs font-medium tracking-caps uppercase text-[color:var(--brand-3-ink)]">
            {status}
          </span>
        ),
      }),
    ],
  },
);

/** The capability-first landing page's layer over lib/home-content.ts. `home-content` says what
 *  each tool is called and where the workflows use it; this says what it does on its own terms
 *  and which page documents it on each access surface. */
import type { ToolId } from '@/lib/home-content';

export interface ToolLink {
  /** The surface, not the page title: the row reads as one choice of how to work. */
  label: string;
  href: string;
}

export interface ToolDetail {
  /** One line, workflow-independent — what the tool is when no workflow is picked. */
  summary: string;
  /** For a tile too narrow for the full name; the feature tile still shows that one. */
  short?: string;
  /** The marketing site's rail is a row of verbs — Generate, Optimize, Fold — which is what
   *  lets seven of them sit on one line. These are ours, in its order of naming. */
  verb: string;
  links: ToolLink[];
}

export const TOOL_DETAILS: Record<ToolId, ToolDetail> = {
  structure: {
    verb: 'Fold',
    summary:
      'Fold a sequence or co-fold a complex — AlphaFold2, Boltz, ESMFold, Protenix, RosettaFold3.',
    links: [
      { label: 'Python API', href: '/references/python-api/fold' },
      { label: 'REST API', href: '/references/rest-api/fold' },
    ],
  },
  'de-novo': {
    verb: 'Generate',
    summary:
      'Generate binders and backbones with BoltzGen and RFdiffusion, or inverse-fold a target structure.',
    links: [
      { label: 'Web app', href: '/tutorials/design/generate/boltzgen?client=app' },
      { label: 'Python API', href: '/references/python-api/models' },
      { label: 'REST API', href: '/references/rest-api/models' },
    ],
  },
  search: {
    verb: 'Search',
    short: 'Search & Clustering',
    summary:
      'Embed, align and cluster sequences to explore natural diversity and your own libraries.',
    links: [
      { label: 'Python API', href: '/references/python-api/embedding' },
      { label: 'REST API', href: '/references/rest-api/embeddings' },
    ],
  },
  selection: {
    verb: 'Select',
    summary:
      'Explore, filter and score an assay dataset to pick the hits worth carrying forward.',
    links: [
      { label: 'How-to guide', href: '/how-tos/select/antibody-hit-selection-ngs' },
    ],
  },
  substitutions: {
    verb: 'Predict',
    summary:
      'Score every substitution, insertion and deletion with PoET-2 before you commit to a library.',
    links: [
      { label: 'Python API', href: '/references/python-api/embedding' },
      { label: 'REST API', href: '/references/rest-api/embeddings' },
    ],
  },
  train: {
    verb: 'Train',
    summary:
      'Train property predictors on your assay data, then check them with cross-validation.',
    links: [
      { label: 'Python API', href: '/references/python-api/predictor' },
      { label: 'REST API', href: '/references/rest-api/predictor' },
    ],
  },
  'active-learning': {
    verb: 'Optimize',
    summary:
      'Design the next library against your objectives, using the models your results trained.',
    links: [
      { label: 'Python API', href: '/references/python-api/design' },
      { label: 'REST API', href: '/references/rest-api/design' },
    ],
  },
};

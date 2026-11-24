import { SITE } from '@/lib/site';

/** Landing page data. */
export const FOOTER_COLUMNS = [
  {
    title: 'Docs',
    links: [
      { label: 'Quickstart', href: '/quickstart' },
      { label: 'Concepts', href: '/concepts' },
      { label: 'How-to guides', href: '/how-tos' },
      { label: 'REST API', href: '/references/rest-api' },
      { label: 'Python API', href: '/references/python-api' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Tutorials', href: '/tutorials' },
      { label: 'Walkthroughs', href: '/tutorials#walkthroughs' },
      { label: 'Demo datasets', href: '/references/resources/demo-datasets' },
      { label: 'Publications', href: '/references/resources/publications' },
      { label: 'FAQ', href: '/references/resources/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'OpenProtein.AI', href: 'https://openprotein.ai' },
      { label: 'Contact sales', href: 'https://openprotein.ai/contact' },
      { label: 'Web app', href: SITE.appUrl },
    ],
  },
];

/** The ids TOOLS declares. Spelled out so a workflow action naming a tool that does not
 *  exist is a type error rather than a card that silently renders the wrong tool. */
export type ToolId =
  | 'structure'
  | 'de-novo'
  | 'search'
  | 'selection'
  | 'substitutions'
  | 'train'
  | 'active-learning';

export interface Tool {
  id: ToolId;
  title: string;
  graphic: string;
}

/** The tool column beside every workflow: one list, same order, whichever tab is open. */
export const TOOLS: Tool[] = [
  { id: 'structure', title: 'Structure Prediction', graphic: 'fold' },
  { id: 'de-novo', title: 'De Novo Design', graphic: 'generate' },
  { id: 'search', title: 'Sequence Search & Clustering', graphic: 'explore' },
  { id: 'selection', title: 'Hit Selection', graphic: 'select' },
  { id: 'substitutions', title: 'Substitution Analysis', graphic: 'substitutions' },
  { id: 'train', title: 'Custom Model Training', graphic: 'train' },
  { id: 'active-learning', title: 'Active Learning', graphic: 'active-learning' },
];

export interface WorkflowAction {
  tool: ToolId;
  /** How the tool serves this step; titles the graphic. */
  text: string;
  /** Graphic key; defaults to the tool's. */
  graphic?: string;
}

export interface WorkflowStep {
  title: string;
  graphic: string;
  actions?: WorkflowAction[];
}

export interface Workflow {
  label: string;
  /** An array in place of a step holds alternatives: do one or the other. */
  steps: (WorkflowStep | WorkflowStep[])[];
  /** Title of the step the last step loops back to. */
  loopTo?: string;
}

const DESIGN_LIBRARY: WorkflowStep = {
  title: 'Design initial mutagenesis library',
  graphic: 'library',
  actions: [{ tool: 'substitutions', text: 'Use PoET-2 substitution analysis to suggest optimal mutations for testing' }],
};

const SYNTHESIZE: WorkflowStep = { title: 'Synthesize and test', graphic: 'synthesize' };

const LEARN: WorkflowStep = {
  title: 'Learn from your results',
  graphic: 'train',
  actions: [{ tool: 'train', text: 'Train specialized models on your data' }],
};

const FOLLOW_UP: WorkflowStep = {
  title: 'Design a follow-up library',
  graphic: 'optimize',
  actions: [
    { tool: 'active-learning', text: 'Use active learning to generate the next library of enhanced variants' },
  ],
};

export const WORKFLOWS: Workflow[] = [
  {
    label: 'Antibodies',
    steps: [
      {
        title: 'Visualize your target antigen',
        graphic: 'antigen',
        actions: [{ tool: 'structure', text: 'Use our structure prediction tools to fold your antigen' }],
      },
      [
        {
          title: 'Design a de novo antibody',
          graphic: 'de-novo',
          actions: [{ tool: 'de-novo', text: 'Use our de novo design tools to generate novel antibodies' }],
        },
        {
          title: 'Select a hit from initial screening',
          graphic: 'screen',
          actions: [{ tool: 'selection', text: 'Select hits for further optimization' }],
        },
      ],
      {
        title: 'Visualize your binding complex',
        graphic: 'complex',
        actions: [{ tool: 'structure', text: 'Use our structure prediction tools to co-fold your antibody with antigen(s)', graphic: 'cofold' }],
      },
      DESIGN_LIBRARY,
      SYNTHESIZE,
      LEARN,
      FOLLOW_UP,
    ],
    loopTo: SYNTHESIZE.title,
  },
  {
    label: 'Enzymes',
    steps: [
      {
        title: 'Discover from natural databases',
        graphic: 'database',
        actions: [{ tool: 'search', text: 'Use our sequence search, embedding and clustering tools to explore the space of native enzyme diversity' }],
      },
      {
        title: 'Fold and visualize starting protein',
        graphic: 'enzyme',
        actions: [{ tool: 'structure', text: 'Use our structure prediction tools to fold your enzyme with substrate' }],
      },
      DESIGN_LIBRARY,
      SYNTHESIZE,
      LEARN,
      FOLLOW_UP,
    ],
    loopTo: SYNTHESIZE.title,
  },
  {
    label: 'General Protein Engineering',
    steps: [
      {
        title: 'Explore',
        graphic: 'explore',
        actions: [
          { tool: 'search', text: 'Use our embedding tools to explore your sequence space' },
          { tool: 'search', text: 'Use our clustering tools to organize your sequences', graphic: 'cluster' },
        ],
      },
      {
        title: 'Visualize',
        graphic: 'fold',
        actions: [{ tool: 'structure', text: 'Use our structure prediction tools to fold your protein' }],
      },
      [
        {
          title: 'Design de novo',
          graphic: 'de-novo',
          actions: [
            { tool: 'de-novo', text: 'Use our de novo design tools to generate novel proteins' },
            { tool: 'de-novo', text: 'Use inverse folding to design sequences for a target structure', graphic: 'inverse-fold' },
          ],
        },
        {
          title: 'Design mutagenesis library',
          graphic: 'library',
          actions: [{ tool: 'substitutions', text: 'Use PoET-2 substitution analysis to suggest optimal mutations for your protein' }],
        },
      ],
      SYNTHESIZE,
      LEARN,
      FOLLOW_UP,
    ],
    loopTo: SYNTHESIZE.title,
  },
];

export interface SitemapItem {
  label: string;
  children?: string[];
}

export interface SitemapGroup {
  title: string;
  items: SitemapItem[];
}

const items = (...labels: (string | SitemapItem)[]): SitemapItem[] =>
  labels.map((label) => (typeof label === 'string' ? { label } : label));

export const SITEMAP: SitemapGroup[][] = [
  [
    { title: 'Getting started', items: items('Installation', 'Quickstart guide') },
    {
      title: 'Concepts',
      items: items(
        'Protein',
        'What is a sequence',
        'Multimeric proteins',
        { label: 'Prompts', children: ['Overview', 'Context', 'Query'] },
        'Scores and likelihoods',
        'Refolding',
        { label: 'Visualization', children: ['Joint plots', 'UMAP', 'Histogram'] },
        {
          label: 'Models',
          children: [
            'Foundation models',
            'Sequence generators',
            'Structure generators',
            'Property predictors',
            'Embeddings',
            'Evaluating models',
            'Fine-tuning models',
          ],
        },
        'Jobs and async',
      ),
    },
  ],
  [
    {
      title: 'Organization',
      items: items('Project', 'Jobs', 'Auth', 'Sharing', 'SSO', 'Account permissions'),
    },
    {
      title: 'Dataset',
      items: items(
        { label: 'Sequence', children: ['MSA', 'Assay', 'Sequence annotations'] },
        'Structure',
        'Align',
        'Library',
      ),
    },
    { title: 'Representations', items: items('SVD', 'Embeddings', 'Attention maps') },
  ],
  [
    {
      title: 'Learn',
      items: items(
        { label: 'In-context learning', children: ['How to build a good prompt'] },
        'Training property predictors',
        'Cross validation',
      ),
    },
    { title: 'Design', items: items('Generate', 'Optimize', 'Acquisition function') },
    {
      title: 'Predict',
      items: items('Structure prediction', 'Score', 'Batch analysis', 'Substitutions', 'Indels', 'Logits'),
    },
    { title: 'Select', items: items('General', 'Sketching (info gain)', 'Advanced filter') },
  ],
  [
    {
      title: 'Analyze',
      items: items(
        'Clustering',
        'UMAP',
        { label: 'Antibody', children: ['Liabilities', 'CDRs', 'Germline', 'Numbering'] },
        { label: 'Structure', children: ['RMSD', 'PAE', 'pLDDT'] },
        'Phylogenetic tree',
      ),
    },
    {
      title: 'Models',
      items: items({ label: 'PoET-2', children: ['PoET antibody', 'System prompt'] }, 'ESM'),
    },
    { title: 'API Reference', items: [] },
    { title: 'Walkthrough', items: [] },
  ],
];

/* The blocks below mirror the marketing site's footer, so the two read as one site. */

export const FOOTER_SOCIALS = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/openprotein', icon: '/linkedin-white-icon.svg' },
  { label: 'X (Twitter)', href: 'https://x.com/openprotein', icon: '/x-white-icon.svg' },
];

export const FOOTER_ADDRESS = ['21 Biopolis Rd', '#02-03/05 Nucleos North Tower', 'Singapore 138567'];

export const FOOTER_LEGAL = [
  { label: 'Privacy Policy', href: 'https://openprotein.ai/privacy-policy' },
  { label: 'Terms & Conditions', href: 'https://openprotein.ai/terms-conditions' },
  { label: 'Cookie Policy', href: 'https://openprotein.ai/cookie-policy' },
];

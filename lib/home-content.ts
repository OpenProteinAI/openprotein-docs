/** Landing page data, mirroring the old index.rst cards. */
export interface CapabilityLink {
  label: string;
  href: string;
}

export interface Capability {
  title: string;
  image: string;
  tint: string;
  links: CapabilityLink[];
}

export const CAPABILITIES: Capability[] = [
  {
    title: 'Enhance directed evolution with zero-shot protein design',
    image: '/_static/overview-img/DocsHome_1.png',
    tint: 'color-mix(in oklab, var(--brand-1-fill) 10%, transparent)',
    links: [
      { label: 'Web-based tools', href: '/web-app/poet' },
      { label: 'Python API tools', href: '/python-api/poet' },
      { label: 'Examples', href: '/resources' },
    ],
  },
  {
    title: 'Design variants using large language models to traverse the protein evolutionary landscape',
    image: '/_static/overview-img/DocsHome_2.png',
    tint: 'color-mix(in oklab, var(--brand-2-fill) 10%, transparent)',
    links: [
      { label: 'Web-based tools', href: '/web-app/opmodels' },
      { label: 'Python API tools', href: '/python-api/property-regression-models' },
      { label: 'Examples', href: '/resources' },
    ],
  },
  {
    title: 'Predict the structure of your designer proteins with deep learning',
    image: '/_static/overview-img/DocsHome_3.png',
    tint: 'color-mix(in oklab, var(--brand-3-fill) 16%, transparent)',
    links: [
      { label: 'Web-based tools', href: '/web-app/structure-prediction' },
      { label: 'Python API tools', href: '/python-api/structure-prediction' },
      { label: 'Example', href: '/walkthroughs/enzyme-engineering' },
    ],
  },
  {
    title: 'Visualize your data to better understand and communicate your results',
    image: '/_static/overview-img/DocsHome_4.png',
    tint: 'color-mix(in oklab, var(--brand-1-fill) 10%, transparent)',
    links: [
      { label: 'Web-based tools', href: '/web-app/opmodels/uploading-your-data' },
      { label: 'Example', href: '/walkthroughs/antibody-engineering' },
    ],
  },
  {
    title: 'Design cost efficient libraries to maximize ROI with limited resourcing',
    image: '/_static/overview-img/DocsHome_5.png',
    tint: 'color-mix(in oklab, var(--brand-2-fill) 10%, transparent)',
    links: [
      { label: 'Web-based tools', href: '/web-app/opmodels/design' },
      { label: 'Python API tools', href: '/python-api/property-regression-models/designing-sequences' },
      { label: 'Example', href: '/walkthroughs/quantitative-decision-making-library-design' },
    ],
  },
  {
    title: 'Get embeddings and attention maps for integration with your ML pipeline',
    image: '/_static/overview-img/DocsHome_6.png',
    tint: 'color-mix(in oklab, var(--brand-3-fill) 16%, transparent)',
    links: [
      { label: 'Python API tools', href: '/python-api/foundation-models' },
      { label: 'Example', href: '/walkthroughs/Embedding_and_visualizing_antibodies' },
    ],
  },
];

export interface Solution {
  title: string;
  body: string;
  properties: string[];
  icon: 'dna' | 'flask' | 'layers';
  tint: string;
  ink: string;
  href: string;
}

export const SOLUTIONS: Solution[] = [
  {
    title: 'Antibodies',
    body: 'Optimize your antibody sequences for key properties.',
    properties: ['Binding affinity', 'Activity', 'Immunogenicity'],
    icon: 'dna',
    tint: 'color-mix(in oklab, var(--brand-1-fill) 12%, transparent)',
    ink: 'var(--brand-1-ink)',
    href: '/walkthroughs',
  },
  {
    title: 'Enzymes',
    body: 'Design novel variants with desired functionality.',
    properties: ['Catalytic efficiency', 'Thermostability', 'Expression'],
    icon: 'flask',
    tint: 'color-mix(in oklab, var(--brand-2-fill) 12%, transparent)',
    ink: 'var(--brand-2-ink)',
    href: '/walkthroughs',
  },
  {
    title: 'Structural proteins',
    body: 'Optimize fitness for your structural proteins of interest.',
    properties: ['Stability', 'Expression'],
    icon: 'layers',
    tint: 'color-mix(in oklab, var(--brand-3-fill) 22%, transparent)',
    ink: 'var(--brand-3-ink)',
    href: '/walkthroughs',
  },
];

export const FOOTER_COLUMNS = [
  {
    title: 'Docs',
    links: [
      { label: 'Getting started', href: '/getting-started' },
      { label: 'Web app', href: '/web-app' },
      { label: 'Python API', href: '/python-api' },
      { label: 'REST API', href: '/rest-api' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Walkthroughs', href: '/walkthroughs' },
      { label: 'Demo datasets', href: '/resources/demo-datasets' },
      { label: 'Publications', href: '/resources/publications' },
      { label: 'FAQ', href: '/resources/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'openprotein.ai', href: 'https://www.openprotein.ai' },
      { label: 'Contact sales', href: 'https://www.openprotein.ai/contact' },
      { label: 'Web app', href: 'https://app.openprotein.ai' },
    ],
  },
];

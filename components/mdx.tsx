import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';

/** fumadocs auto-registers only Callout*, Card*, CodeBlockTab*, pre, a, img, h*, table. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Accordion,
    Accordions,
    Callout,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    ...components,
  };
}

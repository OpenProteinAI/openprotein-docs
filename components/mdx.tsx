import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Bibliography, Cite } from '@/components/mdx/bibliography';
import { Callout } from '@/components/mdx/callout';
import { Figure } from '@/components/mdx/figure';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Screencast } from '@/components/mdx/screencast';
import { SectionCards } from '@/components/mdx/section-cards';
import { TipRow } from '@/components/mdx/tip-row';
import { Publication, Publications } from '@/components/mdx/publication';
import { TutorialLinks, TutorialTopic } from '@/components/mdx/tutorial-topic';
import { PyClass } from '@/components/python-api/py-class';
import { PyGroup } from '@/components/python-api/collapsible';
import { PyFunction } from '@/components/python-api/py-function';
import { PySummary } from '@/components/python-api/py-summary';

/** fumadocs auto-registers only Callout*, Card*, CodeBlockTab*, pre, a, img, h*, table. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Accordion,
    Accordions,
    Bibliography,
    Callout,
    Cite,
    Figure,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    PyClass,
    PyFunction,
    PyGroup,
    Publication,
    Publications,
    PySummary,
    Screencast,
    SectionCards,
    TipRow,
    TutorialLinks,
    TutorialTopic,
    ...components,
  };
}

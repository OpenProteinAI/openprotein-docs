/** The app's own icons, ported from `ui/src/themes/default/img/*.svg`. Hard-coded #282E31
 *  becomes `currentColor`, and a knockout fill reads `--icon-bg` to match the tint behind it.
 *  One file per icon, collected here, the way `ui/src/resources/icons.ts` keeps them. */
import type { JSX, SVGProps } from 'react';
import { StructurePredictionIcon } from '@/components/home/icons/structure-prediction';
import { DeNovoDesignIcon } from '@/components/home/icons/de-novo-design';
import { ClusteringIcon } from '@/components/home/icons/clustering';
import { HitSelectionIcon } from '@/components/home/icons/hit-selection';
import { SubstitutionAnalysisIcon } from '@/components/home/icons/substitution-analysis';
import { ModelTrainingIcon } from '@/components/home/icons/model-training';
import { ActiveLearningIcon } from '@/components/home/icons/active-learning';

export type AppIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

export {
  StructurePredictionIcon,
  DeNovoDesignIcon,
  ClusteringIcon,
  HitSelectionIcon,
  SubstitutionAnalysisIcon,
  ModelTrainingIcon,
  ActiveLearningIcon,
};

/** Keyed by the `graphic` field in lib/home-content.ts; overrides the lucide placeholders. */
export const APP_ICONS: Partial<Record<string, AppIcon>> = {
  fold: StructurePredictionIcon,
  generate: DeNovoDesignIcon,
  explore: ClusteringIcon,
  select: HitSelectionIcon,
  substitutions: SubstitutionAnalysisIcon,
  train: ModelTrainingIcon,
  'active-learning': ActiveLearningIcon,
};

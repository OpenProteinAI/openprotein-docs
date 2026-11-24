import type { ReactNode, SVGProps } from 'react';
import type { ModelToolKey } from '@/lib/model-cards';

// The web app's tool icons (ui: src/themes/default/img), inlined so they take `currentColor`
// and follow the theme; the app's are <img>s stroked in a fixed #282E31.

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, viewBox = '0 0 20 20', children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

function SequenceIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <path d="M16.0867 14.3098C15.0773 11.5877 7.377 14.9785 6.36761 12.2563L7.75079 15.9865C8.76024 18.7087 16.4604 15.3178 17.4699 18.04L16.0867 14.3098Z" />
      <path d="M11.9202 4.30978C10.9108 1.58765 3.2105 4.97847 2.20111 2.25634L3.58428 5.98649C4.59373 8.70868 12.2939 5.31782 13.3034 8.03997L11.9202 4.30978Z" />
      {/* The app fills this strand white to knock it out of the other two; the card's own surface here. */}
      <path
        d="M13.4829 7.58875C14.694 10.2273 6.85141 13.2746 8.0625 15.9132L6.40294 12.2975C5.19185 9.65884 13.0344 6.61166 11.8233 3.97305L13.4829 7.58875Z"
        fill="var(--om-surface, #fff)"
      />
    </Svg>
  );
}

function ModelTrainIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <rect x="3" y="3.25" width="14" height="10.5" rx="2.75" />
      <path d="M6.5 1.75 V3.25 M10 1.75 V3.25 M13.5 1.75 V3.25 M10 13.75 V18.25" />
      <path d="M7.6 15.85 L10 18.25 L12.4 15.85 M8.4 7.97 L11.4 6.83 M8.4 9.03 L11.4 10.17" />
      <g fill="currentColor" stroke="none">
        <circle cx="7" cy="8.5" r="1.25" />
        <circle cx="12.8" cy="6.3" r="1.25" />
        <circle cx="12.8" cy="10.7" r="1.25" />
      </g>
    </Svg>
  );
}

function SequenceBatchIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <rect x="1.75" y="1.75" width="11" height="3" rx="1" />
      <rect x="1.75" y="8.5" width="11" height="3" rx="1" />
      <rect x="1.75" y="15.25" width="11" height="3" rx="1" />
      <g fill="currentColor" stroke="none">
        <circle cx="17" cy="3.25" r="1.2" />
        <circle cx="17" cy="10" r="1.2" />
        <circle cx="17" cy="16.75" r="1.2" />
      </g>
    </Svg>
  );
}

function SequenceSelectionIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <g fill="currentColor" stroke="none">
        <rect x="1.75" y="0.75" width="5.5" height="5.5" rx="1.25" />
        <rect x="1.75" y="13.75" width="5.5" height="5.5" rx="1.25" />
      </g>
      {/* The app's white ticks, knocked out of the filled boxes; the card's own surface here. */}
      <path d="M3.2 3.6 L4.15 4.55 L5.85 2.6 M3.2 16.6 L4.15 17.55 L5.85 15.6" stroke="var(--om-surface, #fff)" strokeWidth={1.2} />
      <rect x="2.375" y="7.875" width="4.25" height="4.25" rx="1" />
      <path d="M10 3.5 H18.25 M10 10 H18.25 M10 16.5 H18.25" />
    </Svg>
  );
}

function SubstitutionIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <rect x="1.75" y="12.5" width="16.5" height="5" rx="1" />
      <path d="M7.25 12.5 V17.5 M12.75 12.5 V17.5 M10 1.75 V10 M7.75 7.75 L10 10 L12.25 7.75" />
    </Svg>
  );
}

function IndelIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <rect x="1.75" y="12.5" width="6.5" height="5" rx="1" />
      <rect x="11.75" y="12.5" width="6.5" height="5" rx="1" />
      <path d="M10 1.75 V10.25 M7.75 8 L10 10.25 L12.25 8" />
    </Svg>
  );
}

function StructureProteinIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1} {...props}>
      <path
        strokeWidth={0.75}
        d="M6.50028 17C7.91095 16.7686 8.36664 16.5451 9 17C9.63336 17.4549 7.86664 18.5451 8.5 19C9.13336 19.4549 12 19 12 19"
      />
      <path d="M2 6C3.41067 5.76864 3.5 -0.5 5 2C6.5 4.5 7.41137 1.17854 8.49994 1.00001C9.58851 0.821468 10.7158 2.48394 10.7158 2.48394" />
      <path d="M12.2304 16.2822C12.5649 15.2881 14.8318 13.6581 16.7016 8.99958L17.8477 10.0994C17.2909 15.0778 14.4075 16.3529 14.1825 17.4525L14.8194 18.1868L11.9102 18.9663L11.0008 15.5723L12.2304 16.2822Z" />
      <path
        strokeWidth={1.25}
        d="M11.9701 1.22648C12.1994 0.988307 12.4896 1.00054 12.6188 1.02162C12.758 1.04442 12.881 1.09967 12.9689 1.14584C13.1525 1.24242 13.3522 1.39003 13.5447 1.55319C13.9372 1.88593 14.3979 2.36646 14.8044 2.89565C15.2063 3.41906 15.5872 4.03171 15.7807 4.62955C15.9665 5.20362 16.0276 5.94323 15.5028 6.50373L15.5038 6.50462L13.8305 8.39616L13.8294 8.39527C13.8229 8.40228 13.8175 8.41056 13.8108 8.41749C13.7814 8.4478 13.7494 8.47431 13.7158 8.49737C13.2381 8.9366 12.5366 9.00928 11.9563 9.0015C11.5036 8.9954 11.0016 8.93478 10.501 8.86137C10.7597 9.10662 11.0054 9.36059 11.1874 9.6139C11.3559 9.84838 11.5177 10.1434 11.5534 10.4788C11.5671 10.6083 11.5597 10.7348 11.5345 10.8569C11.5334 10.9958 11.4891 11.1353 11.3936 11.2506L11.2986 11.3638C11.2875 11.3781 11.2758 11.392 11.2641 11.406L9.90463 13.0427C9.43255 13.6112 8.64655 13.6987 8.00762 13.6902C7.42919 13.6824 6.76956 13.5878 6.13611 13.4875C6.43323 13.7625 6.72171 14.0511 6.92826 14.3386C7.09672 14.5731 7.25862 14.868 7.2942 15.2035C7.3338 15.577 7.20866 15.9279 6.93442 16.2104C6.9199 16.2254 6.90415 16.2403 6.88821 16.2537L5.33252 17.5634C5.1932 17.7079 5.01643 17.7768 4.8546 17.7925C4.6812 17.8093 4.52626 17.7695 4.41891 17.7317C4.20055 17.6548 3.97681 17.514 3.77593 17.3636C3.36175 17.0533 2.88746 16.5844 2.47315 16.0661C2.062 15.5516 1.67447 14.9429 1.47643 14.3457C1.2841 13.7657 1.21878 13.0104 1.76681 12.4459L3.43117 10.7316C3.43262 10.7301 3.43423 10.7288 3.43569 10.7273C3.91267 10.2229 4.65825 10.1428 5.26934 10.151C5.69836 10.1568 6.17169 10.2113 6.64615 10.2794C6.41418 10.0552 6.19739 9.82388 6.03224 9.59402C5.86375 9.3595 5.70189 9.06462 5.66629 8.7291C5.65134 8.58817 5.65896 8.45026 5.6901 8.31823C5.68703 8.21158 5.7095 8.10376 5.76176 8.00609L5.83292 7.90085L7.32088 6.10888C7.79308 5.54035 8.57994 5.45269 9.21887 5.46127C9.80403 5.46916 10.4721 5.56534 11.1122 5.66693C10.8129 5.3903 10.5217 5.09995 10.3137 4.8105C10.1452 4.57599 9.98335 4.28107 9.94777 3.94558C9.90817 3.57206 10.0333 3.22124 10.3075 2.93866L11.9701 1.22648Z"
      />
      <path strokeWidth={0.75} d="M17.5005 9.5C17.5005 9.5 19.5005 7.99999 18.5004 7.49999C17.5002 7 16.9119 5.67849 18.0002 5.5" />
      <path d="M13.0001 9.00001C13.0001 9.00001 11.5 9 9.50009 8.50001C7.50018 8.00002 7.5 8 6 8.50001" />
      <path d="M11.0015 11.129C11.0015 11.129 9.50146 11.129 7.50155 10.629C5.50164 10.1291 5.50146 10.129 4.00146 10.629" />
      <path d="M8.50153 13.629C8.50153 13.629 7.00146 13.629 5.00155 13.129C3.00164 12.6291 3.00146 12.629 1.50146 13.129" />
      <path d="M16.0015 5.87905C16.0015 5.87905 14.4999 6.49998 12.5 6C10.5001 5.50001 10.5 5.5 9.00146 5.37904" />
    </Svg>
  );
}

function ClusteringIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.5} {...props}>
      <g strokeWidth={1.25}>
        <circle cx="10" cy="3.5" r="1.5" />
        <circle cx="3" cy="16.75" r="1.25" />
        <circle cx="8" cy="16.75" r="1.25" />
        <circle cx="12" cy="16.75" r="1.25" />
        <circle cx="17" cy="16.75" r="1.25" />
      </g>
      <path d="M10 5.5L10 8.5 M5.5 9L5.5 12 M3 12.5L3 15 M8 12.5L8 15 M12 12.5L12 15 M17 12.5L17 15 M14.5 9L14.5 12 M14.5 9L5.5 9 M8 12.5H3 M17 12.5H12" />
    </Svg>
  );
}

const TOOL_ICONS: Record<ModelToolKey, (props: IconProps) => ReactNode> = {
  de_novo_design: SequenceIcon,
  train: ModelTrainIcon,
  score_sequences: SequenceBatchIcon,
  substitution_analysis: SubstitutionIcon,
  indel_analysis: IndelIcon,
  structure_prediction: StructureProteinIcon,
  cluster: ClusteringIcon,
  hit_selection: SequenceSelectionIcon,
};

export function ToolIcon({ tool, ...props }: IconProps & { tool: ModelToolKey }) {
  const Icon = TOOL_ICONS[tool];
  return <Icon {...props} />;
}

/** The app's modelVersion.svg. */
export function ModelVersionIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </Svg>
  );
}

/** The app's modelVersions.svg. */
export function ModelVersionsIcon(props: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" strokeWidth={2.25} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Svg>
  );
}

/** The app's long arrow, for a tool row's hover. */
export function ArrowRightIcon({ size = 10, ...props }: IconProps) {
  return (
    <svg width={(size * 22) / 16} height={size} viewBox="0 0 22 16" fill="currentColor" aria-hidden {...props}>
      <path d="M1 7C0.447715 7 0 7.44772 0 8C0 8.55228 0.447715 9 1 9V7ZM21.7071 8.70711C22.0976 8.31658 22.0976 7.68342 21.7071 7.29289L15.3431 0.928932C14.9526 0.538408 14.3195 0.538408 13.9289 0.928932C13.5384 1.31946 13.5384 1.95262 13.9289 2.34315L19.5858 8L13.9289 13.6569C13.5384 14.0474 13.5384 14.6805 13.9289 15.0711C14.3195 15.4616 14.9526 15.4616 15.3431 15.0711L21.7071 8.70711ZM1 9H21V7H1V9Z" />
    </svg>
  );
}

/** The app's dropdown chevron. */
export function ChevronDownIcon({ size = 10, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M1 3.5L5.00014 6.7L9 3.5" />
    </svg>
  );
}

/** The app's chevronSortAsc / chevronSortDesc: the direction's chevron solid, the other faded. */
export function SortDirectionIcon({ direction, size = 14, ...props }: IconProps & { direction: 'asc' | 'desc' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="currentColor" aria-hidden {...props}>
      <path
        fillOpacity={direction === 'asc' ? 1 : 0.3}
        d="M2.17817 2.01676L4.20508 0.120979C4.37755 -0.0403312 4.62262 -0.0403257 4.79508 0.120992L6.82185 2.01676C7.1704 2.3428 6.97322 3 6.52684 3H2.47316C2.02677 3 1.82959 2.34278 2.17817 2.01676Z"
      />
      <path
        fillOpacity={direction === 'desc' ? 1 : 0.3}
        d="M6.82183 6.98324L4.79492 8.87902C4.62245 9.04033 4.37738 9.04033 4.20492 8.87901L2.17815 6.98324C1.8296 6.6572 2.02678 6 2.47316 6L6.52684 6C6.97323 6 7.17041 6.65722 6.82183 6.98324Z"
      />
    </svg>
  );
}

/** The app's search glyph; lighter until the box takes focus. */
export function SearchIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M10.5 10.5L13 13" />
      <circle cx="7" cy="7" r="4" />
    </svg>
  );
}

/** lucide's github, which lucide-react 1.x no longer ships; the app's docs.svg and filter.svg are lucide too. */
export function GithubIcon({ size = 14, ...props }: IconProps) {
  return (
    <Svg size={size} viewBox="0 0 24 24" strokeWidth={2} {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </Svg>
  );
}

/** The app's close glyph, for clearing the search and lifting a filter. */
export function TimesIcon({ size = 14, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden {...props}>
      <path d="M3.5 16.5L16.2279 3.77208 M3.5 3.5L16.2279 16.2279" />
    </svg>
  );
}

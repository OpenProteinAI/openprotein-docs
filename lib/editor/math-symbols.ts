export interface MathSymbol {
  tex: string;
  name: string;
}

const LOWER = 'alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega';
const UPPER = 'Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega';

const GREEK: MathSymbol[] = [
  ...LOWER.split(' ').map((letter) => ({
    tex: `\\${letter}`,
    name: `Greek small letter ${letter.replace(/^var/, '')}${letter.startsWith('var') ? ', variant' : ''}`,
  })),
  ...UPPER.split(' ').map((letter) => ({ tex: `\\${letter}`, name: `Greek capital letter ${letter.toLowerCase()}` })),
];

const list = (rows: [string, string][]): MathSymbol[] => rows.map(([tex, name]) => ({ tex, name }));

export const SYMBOL_SETS: { id: string; label: string; symbols: MathSymbol[] }[] = [
  { id: 'greek', label: 'Greek', symbols: GREEK },
  {
    id: 'operators',
    label: 'Operators',
    symbols: list([
      ['\\pm', 'Plus or minus'],
      ['\\mp', 'Minus or plus'],
      ['\\times', 'Times'],
      ['\\div', 'Divided by'],
      ['\\cdot', 'Centered dot'],
      ['\\circ', 'Composition'],
      ['\\ast', 'Asterisk'],
      ['\\star', 'Star'],
      ['\\oplus', 'Circled plus'],
      ['\\otimes', 'Circled times'],
      ['\\odot', 'Circled dot'],
      ['\\nabla', 'Nabla'],
      ['\\partial', 'Partial derivative'],
      ['\\sum', 'Sum'],
      ['\\prod', 'Product'],
      ['\\int', 'Integral'],
      ['\\iint', 'Double integral'],
      ['\\oint', 'Contour integral'],
      ['\\bigcup', 'Union over a family'],
      ['\\bigcap', 'Intersection over a family'],
    ]),
  },
  {
    id: 'relations',
    label: 'Relations',
    symbols: list([
      ['\\leq', 'Less than or equal to'],
      ['\\geq', 'Greater than or equal to'],
      ['\\neq', 'Not equal to'],
      ['\\approx', 'Approximately equal to'],
      ['\\equiv', 'Identical to'],
      ['\\sim', 'Similar to'],
      ['\\simeq', 'Asymptotically equal to'],
      ['\\cong', 'Congruent to'],
      ['\\propto', 'Proportional to'],
      ['\\ll', 'Much less than'],
      ['\\gg', 'Much greater than'],
      ['\\prec', 'Precedes'],
      ['\\succ', 'Succeeds'],
      ['\\perp', 'Perpendicular to'],
      ['\\parallel', 'Parallel to'],
      ['\\mid', 'Divides, or given'],
      ['\\in', 'Element of'],
      ['\\notin', 'Not an element of'],
      ['\\subset', 'Subset of'],
      ['\\subseteq', 'Subset of or equal to'],
      ['\\supset', 'Superset of'],
      ['\\supseteq', 'Superset of or equal to'],
    ]),
  },
  {
    id: 'arrows',
    label: 'Arrows',
    symbols: list([
      ['\\to', 'Right arrow'],
      ['\\leftarrow', 'Left arrow'],
      ['\\leftrightarrow', 'Left right arrow'],
      ['\\Rightarrow', 'Implies'],
      ['\\Leftarrow', 'Implied by'],
      ['\\Leftrightarrow', 'If and only if'],
      ['\\mapsto', 'Maps to'],
      ['\\longrightarrow', 'Long right arrow'],
      ['\\hookrightarrow', 'Hook right arrow'],
      ['\\uparrow', 'Up arrow'],
      ['\\downarrow', 'Down arrow'],
      ['\\nearrow', 'North east arrow'],
      ['\\searrow', 'South east arrow'],
      ['\\rightleftharpoons', 'Equilibrium'],
    ]),
  },
  {
    id: 'sets',
    label: 'Sets',
    symbols: list([
      ['\\forall', 'For all'],
      ['\\exists', 'There exists'],
      ['\\nexists', 'There does not exist'],
      ['\\neg', 'Not'],
      ['\\land', 'And'],
      ['\\lor', 'Or'],
      ['\\emptyset', 'Empty set'],
      ['\\cup', 'Union'],
      ['\\cap', 'Intersection'],
      ['\\setminus', 'Set difference'],
      ['\\mathbb{R}', 'Real numbers'],
      ['\\mathbb{N}', 'Natural numbers'],
      ['\\mathbb{Z}', 'Integers'],
      ['\\mathbb{Q}', 'Rational numbers'],
      ['\\mathbb{C}', 'Complex numbers'],
      ['\\therefore', 'Therefore'],
      ['\\because', 'Because'],
    ]),
  },
  {
    id: 'misc',
    label: 'Misc',
    symbols: list([
      ['\\infty', 'Infinity'],
      ['\\ell', 'Script l'],
      ['\\hbar', 'Reduced Planck constant'],
      ['\\Re', 'Real part'],
      ['\\Im', 'Imaginary part'],
      ['\\aleph', 'Aleph'],
      ['\\angle', 'Angle'],
      ['\\triangle', 'Triangle'],
      ['\\prime', 'Prime'],
      ['^\\circ', 'Degree'],
      ['\\ldots', 'Low dots'],
      ['\\cdots', 'Centered dots'],
      ['\\vdots', 'Vertical dots'],
      ['\\ddots', 'Diagonal dots'],
    ]),
  },
];

export function searchSymbols(query: string): MathSymbol[] {
  const needle = query.trim().toLowerCase();
  return SYMBOL_SETS.flatMap((set) => set.symbols).filter(
    (symbol) => symbol.tex.toLowerCase().includes(needle) || symbol.name.toLowerCase().includes(needle),
  );
}

/** The header nav. `also` lists other sections a pill lights up for. */
export const SECTIONS: readonly { text: string; url: string; also?: readonly string[] }[] = [
  { text: 'Overview', url: '/overview' },
  { text: 'Quickstart', url: '/quickstart' },
  { text: 'Concepts', url: '/concepts' },
  { text: 'Tutorials', url: '/tutorials' },
  { text: 'How-to', url: '/how-tos' },
  { text: 'Models', url: '/models' },
  { text: 'References', url: '/references' },
];

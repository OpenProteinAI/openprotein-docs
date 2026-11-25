/** A tutorial with both an App and a Python version shows one; `?client=` wins over the stored pick. */
export type TutorialClient = 'app' | 'python';

export const CLIENT_PARAM = 'client';
export const CLIENT_KEY = 'op-tutorial-client';

export function parseClient(value: string | null | undefined): TutorialClient | null {
  return value === 'app' || value === 'python' ? value : null;
}

/** Runs before paint, so a Python reader never sees the App version flash by. */
export const CLIENT_PREPAINT = `try{var c=new URLSearchParams(location.search).get('${CLIENT_PARAM}');if(c!=='app'&&c!=='python')c=localStorage.getItem('${CLIENT_KEY}');if(c==='python')document.documentElement.dataset.tutorialClient=c}catch(e){}`;

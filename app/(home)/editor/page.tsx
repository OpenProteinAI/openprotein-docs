import type { Metadata } from 'next';
import { EditorGate } from '@/components/editor/editor-gate';

export const metadata: Metadata = {
  title: 'Editor',
  robots: { index: false, follow: false },
};

export default function EditorPage() {
  return <EditorGate />;
}

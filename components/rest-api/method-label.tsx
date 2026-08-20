/** Copied from fumadocs-openapi's own MethodLabel: the playground draws its badge beside ours. */
const COLOR: Record<string, string> = {
  put: 'text-yellow-600 dark:text-yellow-400',
  patch: 'text-orange-600 dark:text-orange-400',
  post: 'text-blue-600 dark:text-blue-400',
  delete: 'text-red-600 dark:text-red-400',
};

export function MethodLabel({ method, className = '' }: { method: string; className?: string }) {
  const color = COLOR[method.toLowerCase()] ?? 'text-green-600 dark:text-green-400';
  return <span className={`font-mono font-medium ${color} ${className}`}>{method.toUpperCase()}</span>;
}

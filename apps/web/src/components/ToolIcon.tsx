import { File, icons, type LucideProps } from 'lucide-react';

/** Renders the registry's lucide icon name. Server-only use keeps the icon set out of client JS. */
export function ToolIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? File;
  return <Icon aria-hidden {...props} />;
}

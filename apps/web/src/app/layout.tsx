import type { ReactNode } from 'react';
import './globals.css';

// The real root layout (with <html lang dir>) is app/[locale]/layout.tsx. This one exists only so
// app/not-found.tsx can render for paths outside any locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}

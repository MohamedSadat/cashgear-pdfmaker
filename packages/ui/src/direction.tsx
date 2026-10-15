'use client';

import { Direction } from 'radix-ui';
import type { ReactNode } from 'react';

/** Tells Radix primitives the reading direction (rtl for Arabic). */
export function DirectionProvider({ dir, children }: { dir: 'ltr' | 'rtl'; children: ReactNode }) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}

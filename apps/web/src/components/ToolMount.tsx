'use client';

import type { ToolInput } from '@repo/pdf-client';
import { DropzoneShell } from '@repo/ui/tool-runner/shell';
import dynamic from 'next/dynamic';
import { type ComponentType, createContext, useContext } from 'react';

// The shell needs the tool's limits, but next/dynamic's loading component takes no props.
const InputContext = createContext<ToolInput | null>(null);

function Shell() {
  const input = useContext(InputContext);
  return input ? <DropzoneShell tool={{ input }} /> : null;
}

// One entry per browser tool. The tool's JavaScript loads after first paint; until then the
// server-rendered shell holds its place, so nothing shifts.
const TOOLS: Record<string, ComponentType> = {
  merge: dynamic(() => import('@repo/ui/tools/merge'), { ssr: false, loading: Shell }),
  split: dynamic(() => import('@repo/ui/tools/split'), { ssr: false, loading: Shell }),
};

export function ToolMount({ toolId, input }: { toolId: string; input: ToolInput }) {
  const Tool = TOOLS[toolId];
  if (!Tool) throw new Error(`ToolMount: no UI mapped for tool "${toolId}"`);
  return (
    <InputContext.Provider value={input}>
      <Tool />
    </InputContext.Provider>
  );
}

'use client';

import { requireTool } from '@repo/pdf-client';
import { ToolRunner } from '../tool-runner/ToolRunner';

const tool = requireTool('merge');

/** Loaded with next/dynamic after first paint; pdf-lib itself loads only inside the worker. */
export default function MergeTool() {
  return <ToolRunner tool={tool} />;
}

import type { Progress } from '../engine/types';
import { toPdfClientError } from '../errors';
import { execute } from './execute';
import type { RunRequest, WorkerMessage } from './protocol';

// The DOM and WebWorker libs can't be loaded together, so type only what this file uses.
interface WorkerScope {
  postMessage(message: WorkerMessage, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null;
}

// One worker per run: the client terminates it afterwards, which frees all of its memory.
const scope = self as unknown as WorkerScope;

function send(message: WorkerMessage, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

scope.onmessage = async (event) => {
  const { toolId, options, inputs, producer } = event.data;
  try {
    const output = await execute(
      toolId,
      inputs.map((buffer) => new Uint8Array(buffer)),
      options,
      {
        onProgress: (progress: Progress) => send({ type: 'progress', progress }),
        ...(producer ? { producer } : {}),
      },
    );
    send({ type: 'done', output: output.buffer }, [output.buffer]);
  } catch (error) {
    send({ type: 'error', error: toPdfClientError(error).toJSON() });
  }
};

send({ type: 'ready' });

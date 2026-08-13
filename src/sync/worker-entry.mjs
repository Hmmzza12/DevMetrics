import { register } from 'tsx/esm/api';

// Registers the tsx loader synchronously within this worker thread before
// loading any TypeScript. `--import` execArgv loader hooks are unreliable
// across worker_threads on some Node versions, so we register in-thread here
// instead of depending on flag propagation from the parent process.
register();

await import('./worker.ts');

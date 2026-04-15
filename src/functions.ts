import { onRequest } from 'firebase-functions/v2/https';
import { app } from './index';

export const api = onRequest(
  {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
    invoker: 'public',
    cors: true,
    minInstances: 1
  },
  app
);

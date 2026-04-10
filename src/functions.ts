import { onRequest } from 'firebase-functions/v2/https';
import { app } from './index';

export const api = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
    invoker: 'public'
  },
  app
);

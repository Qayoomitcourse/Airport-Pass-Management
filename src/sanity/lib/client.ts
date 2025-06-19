// /sanity/lib/client.ts

import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId, useCdn } from '../env';

/**
 * The primary, read-only client for fetching data.
 * It uses the CDN for speed and is safe to use on the client-side.
 */
export const client = createClient({
  apiVersion,
  dataset,
  projectId,
  useCdn,
});

/**
 * A dedicated client for write operations (creating, updating, deleting documents).
 * This client REQUIRES a token with write permissions and MUST NOT use the CDN.
 * It should only be used in server-side code (API routes, server actions, auth callbacks).
 */
export const writeClient = createClient({
  apiVersion,
  dataset,
  projectId,
  useCdn: false, // Writes must go to the live API
  token: process.env.SANITY_API_WRITE_TOKEN, // Use a securely stored token
});
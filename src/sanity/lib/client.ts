import createClient, { type SanityClient, type ClientConfig } from '@sanity/client';
import {
  apiVersion,
  dataset,
  projectId,
  sanityApiWriteToken,
  sanityApiPreviewToken,
} from '../env';

console.log("--- client.ts ---");
console.log("projectId received in client.ts:", projectId);
console.log("dataset received in client.ts:", dataset);
console.log("sanityApiWriteToken received in client.ts:", sanityApiWriteToken ? "SET" : "NOT SET");

const useCdnForReads = process.env.NODE_ENV === 'production';

const baseConfigSanity: Omit<ClientConfig, 'token' | 'perspective' | 'useCdn' | 'ignoreBrowserTokenWarning'> = {
  projectId,
  dataset,
  apiVersion,
};

console.log("Base config for Sanity client:", baseConfigSanity);

export const client: SanityClient = createClient({
  ...baseConfigSanity,
  useCdn: useCdnForReads,
});
console.log("Read client configured.");

let writeClientInstance: SanityClient;
if (sanityApiWriteToken && projectId && dataset) {
  writeClientInstance = createClient({
    ...baseConfigSanity,
    useCdn: false,
    token: sanityApiWriteToken,
    ignoreBrowserTokenWarning: true,
  });
  console.log("Write client configured WITH token.");
} else {
  console.warn(
    'Sanity write client is not configured properly because SANITY_API_WRITE_TOKEN, projectId, or dataset is missing. Write operations will fail.'
  );
  writeClientInstance = createClient({ ...baseConfigSanity, useCdn: false });
  console.log("Write client configured WITHOUT token (dummy).");
}
export const writeClient = writeClientInstance;

let previewClientInstance: SanityClient | null = null;
if (sanityApiPreviewToken && projectId && dataset) {
  const previewConfig: ClientConfig & { perspective: 'previewDrafts' } = {
    ...baseConfigSanity,
    useCdn: false,
    token: sanityApiPreviewToken,
    ignoreBrowserTokenWarning: true,
    perspective: 'previewDrafts',
  };
  previewClientInstance = createClient(previewConfig);
  console.log("Preview client configured.");
}
export const previewClient = previewClientInstance;

console.log("--- end client.ts ---");

// src/sanity/lib/env.ts

// This function helps ensure that configuration defined in .env files is set
// Making it easier to error out if it's not defined
export function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    // In a server environment, this will crash the app on startup if vars are missing.
    // On the client-side, it might throw an error when the module is imported.
    throw new Error(errorMessage);
  }
  return v;
}

// Publicly available environment variables (can be prefixed with NEXT_PUBLIC_)
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-03-01'; // Use a recent valid API version

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
);

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
);

// Server-side only environment variables (NEVER prefix with NEXT_PUBLIC_)
// These will be undefined on the client-side, which is expected and handled by client configurations.

// Token for write operations (creating, updating, deleting documents and assets)
// MUST be set in your .env.local and server deployment environment.
export const sanityApiWriteToken = process.env.SANITY_API_WRITE_TOKEN;

// Optional: Token for reading preview drafts (if you use Next.js Preview Mode)
// MUST be set in your .env.local and server deployment environment if used.
export const sanityApiPreviewToken = process.env.SANITY_API_PREVIEW_TOKEN;

// Check if critical server-side tokens are missing during server startup (for API routes)
// This check will only run effectively on the server.
if (typeof window === 'undefined') { // Check if running on the server
  if (!sanityApiWriteToken) {
    // console.warn( // Use console.warn or throw error depending on strictness
    //   'Warning: Missing environment variable: SANITY_API_WRITE_TOKEN. Write operations will fail.'
    // );
    // For critical operations, you might want to throw an error to prevent the app from starting improperly:
    // throw new Error('Missing environment variable: SANITY_API_WRITE_TOKEN. Server-side mutations will fail.');
  }
}

//sanity/lib/serverClient.ts
import { createClient } from '@sanity/client'

// Server-side client for write operations
export const serverWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  useCdn: false, // Always false for server-side and write operations
  token: process.env.SANITY_WRITE_TOKEN!, // Required for write operations
  perspective: 'published',
})

// Read-only client (if needed)
export const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  useCdn: false, // Set to false for server-side usage
  perspective: 'published',
})
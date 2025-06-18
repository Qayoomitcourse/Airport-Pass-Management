// lib/sanity.ts (Alternative for v6+)
import { createClient } from 'next-sanity';

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN!, // Only for server-side operations
  useCdn: false, // Set to true for production if you want CDN
  apiVersion: '2024-01-01', // Use current date or your preferred API version
});

// For client-side operations (without token)
export const clientPublic = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  useCdn: true,
  apiVersion: '2024-01-01',
});
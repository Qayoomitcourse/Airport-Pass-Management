// /sanity/env.ts

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-05-08'; // Use a specific date

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
);

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
);

// Use CDN on production builds
export const useCdn = process.env.NODE_ENV === 'production';

/**
 * A helper function to assert that a value is not undefined.
 * Throws an error if the value is undefined.
 * @param v The value to check.
 * @param errorMessage The error message to throw if the value is undefined.
 * @returns The value if it is not undefined.
 */
export function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage);
  }

  return v;
}
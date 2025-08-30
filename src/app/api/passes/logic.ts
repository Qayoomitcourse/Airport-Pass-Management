// /app/api/passes/logic.ts
import { writeClient } from '@/sanity/lib/client';
import { PassCategory } from '@/app/types';

/**
 * Finds the next available passId for a given category.
 * It checks the highest existing passId in the database and also
 * respects the manually set base numbers.
 *
 * @param {PassCategory} category - The pass category ('cargo' or 'landside').
 * @returns {Promise<number>} The next sequential pass ID as a number.
 */
export async function getNextPassId(category: PassCategory): Promise<number> {
  const baseIds: Record<PassCategory, number> = {
    cargo: 1038,
    landside: 46,
  };

  // Fetch ALL passIds for this category
  const query = `*[_type == "employeePass" && category == $category].passId`;
  const params = { category };

  const allPassIds = await writeClient.fetch<string[]>(query, params, {
    cache: 'no-store',
  });

  // Convert to numbers and find max
  const numericIds = allPassIds
    .map((id) => parseInt(id, 10))
    .filter((n) => !isNaN(n));

  const highestExistingId = numericIds.length > 0 ? Math.max(...numericIds) : 0;

  // Next ID = greater of DB max or baseIds + 1
  const nextId = Math.max(highestExistingId, baseIds[category]) + 1;

  return nextId;
}

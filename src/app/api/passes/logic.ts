// /app/api/passes/logic.ts
import { writeClient } from '@/sanity/lib/client'; // Use your write client
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
  // Define the last manually issued ID for each category.
  // The next one will be this number + 1.
  const baseIds: Record<PassCategory, number> = {
    cargo: 1038,
    landside: 46,
  };

  // GROQ query to find the document with the highest numerical passId for the given category.
  // This is the key change: order by the number value, not creation date.
  const query = `*[_type == "employeePass" && category == $category] | order(passId desc) [0].passId`;
  const params = { category };

  // Fetch the highest passId from Sanity. It will be a number or null.
  const highestExistingId = await writeClient.fetch<number | null>(query, params);

  // Determine the next ID. It's the greater of the two possibilities (highest in DB or manual base) plus one.
  // This correctly handles starting a new sequence and continuing an existing one.
  const nextId = Math.max(highestExistingId ?? 0, baseIds[category]) + 1;

  return nextId;
}
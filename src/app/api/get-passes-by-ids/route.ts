// app/api/get-passes-by-ids/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
// No longer need urlFor, as the query will handle the image URL directly.

// This interface reflects the data we will return from the API
interface EmployeePrintData {
  _id: string;
  passId: string;
  name: string;
  designation: string;
  organization: string;
  cnic: string;
  dateOfExpiry: string;
  category: 'cargo' | 'landside';
  photo?: string | null; // The query will transform the photo asset to a URL string
  areaAllowed?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { passIds, category } = await request.json();

    // --- Input Validation (Your existing validation is great) ---
    if (!passIds || !Array.isArray(passIds) || passIds.length === 0) {
      return NextResponse.json({ error: 'Pass IDs are required and must be a non-empty array' }, { status: 400 });
    }
    if (!category || !['cargo', 'landside'].includes(category)) {
      return NextResponse.json({ error: 'A valid category ("cargo" or "landside") is required' }, { status: 400 });
    }
    if (passIds.length > 6) {
      return NextResponse.json({ error: 'You can print a maximum of 6 cards at a time.' }, { status: 400 });
    }

    // --- OPTIMIZED GROQ QUERY ---
    // 1. We assume passId is a string in Sanity, simplifying the filter.
    // 2. We project the photo asset directly to its URL using `photo.asset->url`.
    //    This is more efficient than fetching the asset reference and processing it later.
    const query = `
      *[_type == "employeePass" && category == $category && passId in $passIds]{
        _id,
        passId,
        name,
        designation,
        organization,
        cnic,
        dateOfExpiry,
        category,
        "photo": photo.asset->url, // This gets the direct image URL
        areaAllowed
      }
    `;

    // The parameters for the query are simpler now
    const params = {
      category: category,
      passIds: passIds.map(id => String(id)), // Ensure all IDs are strings for the query
    };

    // Execute the query
    const employees = await client.fetch<EmployeePrintData[]>(query, params);

    // --- MORE EFFICIENT "NOT FOUND" CALCULATION ---
    // Using a Set for lookups is much faster than Array.includes() for larger lists.
    const foundIds = new Set(employees.map(emp => emp.passId));
    const notFoundIds = passIds.filter(id => !foundIds.has(String(id)));

    // --- CLEANED RESPONSE ---
    return NextResponse.json({
      employees: employees, // The data is already processed by the query
      notFoundIds: notFoundIds,
      totalFound: employees.length
    });

  } catch (error) {
    console.error('Error in /api/get-passes-by-ids:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred while fetching passes.' },
      { status: 500 }
    );
  }
}
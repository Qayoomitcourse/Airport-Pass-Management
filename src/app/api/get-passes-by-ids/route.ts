// /app/api/get-passes-by-ids/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';

// Zod schema to validate the incoming request
const requestSchema = z.object({
  passIds: z.array(z.string().or(z.number())).min(1, "At least one Pass ID is required."),
  category: z.enum(['cargo', 'landside']),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validation = requestSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request body", details: validation.error.flatten() }, { status: 400 });
    }

    const { category } = validation.data;
    // Sanity stores passId as a number, so we must convert the incoming strings to numbers for the query
    const numericPassIds = validation.data.passIds.map(id => Number(id));

    // A powerful GROQ query to fetch all matching passes in one go
    // The `...` spreads all top-level fields
    // The `photo` field is projected to get the full image URL
    // The `passId` is explicitly included
    const query = `
      *[_type == "employeePass" && category == $category && passId in $numericPassIds] {
        ...,
        "photo": photo.asset->url,
        passId
      }
    `;

    const params = {
      category,
      numericPassIds,
    };

    const employees = await serverWriteClient.fetch(query, params);

    // Determine which IDs were found and which were not
    const foundIds = new Set(employees.map((emp: { passId: number }) => String(emp.passId)));
    const requestedIds = new Set(validation.data.passIds.map(id => String(id)));
    
    const notFoundIds = Array.from(requestedIds).filter(id => !foundIds.has(id));

    return NextResponse.json({
      employees,
      notFoundIds,
      totalFound: employees.length,
    });

  } catch (error) {
    console.error('Error fetching passes by IDs:', error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
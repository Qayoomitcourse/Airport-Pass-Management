import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient as client } from '@/sanity/lib/client';
import { PassCategory } from '@/app/types';

// Schema for historical import, requires passId
const historicalPassSchema = z.object({
  passId: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number({ invalid_type_error: "Pass ID must be a number." }).int().positive("Pass ID must be a positive number.")
  ),
  name: z.string().min(1, "Name is required"),
  category: z.preprocess(
    (arg) => (typeof arg === 'string' ? arg.trim().toLowerCase() : arg),
    z.enum(['cargo', 'landside'], { errorMap: () => ({ message: "Category must be 'cargo' or 'landside'."}) })
  ),
  designation: z.string().min(1, "Designation is required"),
  organization: z.string().min(1, "Organization is required"),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format."),
  areaAllowed: z.string().optional(),
  dateOfEntry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid Date of Entry format."),
  dateOfExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid Date of Expiry format."),
});

type IncomingPassData = z.infer<typeof historicalPassSchema>;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { passes } = (await req.json()) as { passes: Partial<IncomingPassData>[] };
    if (!Array.isArray(passes) || passes.length === 0) {
      return NextResponse.json({ error: 'No pass data provided.' }, { status: 400 });
    }

    const results = [];
    const transaction = client.transaction();

    // --- KEY CHANGE: Fetch existing IDs and CNICs for pre-validation ---
    const existingPasses = await client.fetch<{ passId: number; category: PassCategory; cnic: string }[]>(`*[_type == "employeePass"]{passId, category, cnic}`);
    
    const existingIdsByCategory = {
        cargo: new Set<number>(),
        landside: new Set<number>()
    };
    const existingCnics = new Set<string>();

    for (const pass of existingPasses) {
        if (pass.cnic) existingCnics.add(pass.cnic);
        if (pass.category === 'cargo' || pass.category === 'landside') {
            existingIdsByCategory[pass.category].add(pass.passId);
        }
    }
    
    for (const [index, passData] of passes.entries()) {
        const originalRow = index + 2; // Excel row number (1-based header + 1)
        const validation = historicalPassSchema.safeParse(passData);

        if (!validation.success) {
          results.push({ row: originalRow, status: 'Error', message: validation.error.flatten().fieldErrors });
          continue;
        }

        const { passId, category, cnic } = validation.data;

        // --- KEY CHANGE: Check for duplicate Pass ID within the category ---
        if (existingIdsByCategory[category].has(passId)) {
          results.push({ row: originalRow, status: 'Error', message: `Pass ID ${passId} already exists for category '${category}'.` });
          continue;
        }

        // --- KEY CHANGE: Check for duplicate CNIC ---
        if (existingCnics.has(cnic)) {
          results.push({ row: originalRow, status: 'Error', message: `CNIC ${cnic} already exists.` });
          continue;
        }

        // Add to sets to prevent duplicates within the same upload batch
        existingIdsByCategory[category].add(passId);
        existingCnics.add(cnic);
        
        const passDocument = {
          _type: 'employeePass',
          ...validation.data,
          // `passId` is already in validation.data
          areaAllowed: validation.data.areaAllowed?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
          author: { _type: 'reference', _ref: session.user.id },
        };
        
        transaction.create(passDocument);
        results.push({ row: originalRow, status: 'Success', message: 'Prepared for creation.', passId: passId });
    }

    const successCount = results.filter(r => r.status === 'Success').length;
    if (successCount > 0) {
      // The commit will still fail if there's a race condition, but our pre-checks prevent most issues.
      await transaction.commit();
    }
    
    return NextResponse.json({
      message: `Processing complete. ${successCount} successful, ${results.length - successCount} failed.`,
      results
    });

  } catch (error) {
    console.error('Historical bulk import error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
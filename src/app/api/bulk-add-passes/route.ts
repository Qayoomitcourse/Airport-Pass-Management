// /app/api/bulk-add-passes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient as client } from '@/sanity/lib/client';
import { PassCategory } from '@/app/types';
import { getNextPassId } from '../passes/logic';

const bulkPassSchema = z.object({
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

type IncomingPassData = z.infer<typeof bulkPassSchema>;
type PassWithRow = IncomingPassData & { originalRow: number };

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
    const existingCnics = await client.fetch<string[]>('*[_type == "employeePass"].cnic');
    const cnicSet = new Set<string>(existingCnics);

    const passesByCategory = passes.reduce((acc, pass, index) => {
      const category = pass.category;
      if (category === 'cargo' || category === 'landside') {
        if (!acc[category]) acc[category] = [];
        acc[category].push({ ...(pass as IncomingPassData), originalRow: index + 2 });
      }
      return acc;
    }, {} as Record<PassCategory, PassWithRow[]>);

    for (const category of Object.keys(passesByCategory) as PassCategory[]) {
      const passBatch = passesByCategory[category];
      let nextId = await getNextPassId(category);
      for (const passData of passBatch) {
        const validation = bulkPassSchema.safeParse(passData);
        if (!validation.success) {
          results.push({ row: passData.originalRow, status: 'Error', message: validation.error.flatten().fieldErrors });
          continue;
        }
        if (cnicSet.has(validation.data.cnic)) {
          results.push({ row: passData.originalRow, status: 'Error', message: `CNIC ${validation.data.cnic} already exists.` });
          continue;
        }
        cnicSet.add(validation.data.cnic);

        const passDocument = {
          _type: 'employeePass',
          ...validation.data,
          passId: nextId,
          areaAllowed: validation.data.areaAllowed?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
          author: { _type: 'reference', _ref: session.user.id },
        };
        
        transaction.create(passDocument);
        results.push({ row: passData.originalRow, status: 'Success', message: 'Prepared for creation.', passId: nextId });
        nextId++;
      }
    }

    // *** THE FIX IS HERE ***
    // First, count how many successful operations we prepared.
    const successCount = results.filter(r => r.status === 'Success').length;
    
    // Only commit the transaction if there are successful operations to perform.
    if (successCount > 0) {
      await transaction.commit();
    }
    // *** END OF FIX ***
    
    // Now, return the response using the count we already calculated.
    return NextResponse.json({
      message: `Processing complete. ${successCount} successful, ${results.length - successCount} failed.`,
      results
    });

  } catch (error) {
    console.error('Bulk add error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
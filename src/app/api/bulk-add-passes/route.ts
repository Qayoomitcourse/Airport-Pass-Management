// /app/api/bulk-add-passes/route.ts (DEFINITIVELY CORRECTED)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth"; 
import { z } from 'zod';
import { serverWriteClient as client } from '@/sanity/lib/serverClient'; 
import { PassCategory } from '@/app/types'; 
import { SanityDocument } from 'next-sanity';

// This interface describes the full document we expect back from Sanity
interface CreatedPassDocument extends SanityDocument {
  passId: number;
  name: string;
  cnic: string;
}

// Zod schema for validating incoming data from the Excel file
const passDataFromExcelSchema = z.object({
  name: z.string().min(1, "Name is required."),
  category: z.preprocess(
    (arg) => (typeof arg === 'string' ? arg.trim().toLowerCase() : arg),
    z.enum(['cargo', 'landside'] as [PassCategory, ...PassCategory[]], {
        errorMap: () => ({ message: "Category must be 'cargo' or 'landside'."})
    })
  ),
  designation: z.string().min(1, "Designation is required."),
  organization: z.string().min(1, "Organization is required."),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format. Use XXXXX-XXXXXXX-X."),
  areaAllowed: z.string().optional(),
  dateOfEntry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid Date of Entry format. Use YYYY-MM-DD."),
  dateOfExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid Date of Expiry format. Use YYYY-MM-DD."),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'editor')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { passes } = await req.json();
  if (!Array.isArray(passes) || passes.length === 0) {
    return NextResponse.json({ error: 'No pass data provided or invalid format.' }, { status: 400 });
  }

  const results: Array<{ row: number; status: string; message: string; passId?: number; documentId?: string }> = [];

  for (let i = 0; i < passes.length; i++) {
    const rowData = passes[i];
    const excelRowNum = i + 2;

    try {
      const validatedData = passDataFromExcelSchema.parse(rowData);

      const existingPassByCnic = await client.fetch('*[_type == "pass" && cnic == $cnic][0]', { cnic: validatedData.cnic });
      if (existingPassByCnic) {
        throw new Error(`CNIC ${validatedData.cnic} already exists in the system.`);
      }
      
      const passDocument = {
        _type: 'pass',
        ...validatedData,
        areaAllowed: validatedData.areaAllowed?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
        author: { _type: 'reference', _ref: session.user.id }
      };

      const createdDocument = await client.create(passDocument);
      
      // --- THE FIX IS HERE: Use a two-step assertion ---
      const typedDocument = createdDocument as unknown as CreatedPassDocument;

      results.push({ 
        row: excelRowNum, 
        status: 'Success', 
        message: 'Pass created.', 
        documentId: typedDocument._id, 
        passId: typedDocument.passId 
      });

    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof z.ZodError) {
        errorMessage = error.errors.map(e => `${e.path.join('.') || 'Field'}: ${e.message}`).join('; ');
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      results.push({ row: excelRowNum, status: 'Error', message: errorMessage });
    }
  }

  const successCount = results.filter(r => r.status === 'Success').length;
  return NextResponse.json({ 
    message: `Processing complete. ${successCount} successes, ${results.length - successCount} errors.`,
    results 
  }, { status: 200 });
}
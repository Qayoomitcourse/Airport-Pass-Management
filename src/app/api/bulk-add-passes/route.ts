import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";;
import { z } from 'zod';
import { serverWriteClient as client } from '@/sanity/lib/serverClient'; 
import { PassCategory } from '@/app/types';

const passSchemaFromExcel = z.object({
  passId: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().positive("Pass ID must be a positive number.")
  ),
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
  dateOfEntry: z.preprocess((arg) => (arg ? new Date(arg as string) : undefined), z.date({errorMap: () => ({message: "Invalid Date of Entry"})})),
  dateOfExpiry: z.preprocess((arg) => (arg ? new Date(arg as string) : undefined), z.date({errorMap: () => ({message: "Invalid Date of Expiry"})})),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { passes } = await req.json();
  if (!Array.isArray(passes) || passes.length === 0) {
    return NextResponse.json({ error: 'No pass data provided or invalid format.' }, { status: 400 });
  }

  const results: Array<{ row: number; status: string; message: string; passId?: number; documentId?: string }> = [];
  let successCount = 0;

  for (let i = 0; i < passes.length; i++) {
    const rowData = passes[i];
    const excelRowNum = i + 2;

    try {
      const validatedData = passSchemaFromExcel.parse(rowData);
      const userProvidedPassId = validatedData.passId;

      const existingPassById = await client.fetch('*[_type == "employeePass" && passId == $id][0]', { id: userProvidedPassId });
      if (existingPassById) {
        throw new Error(`Pass ID ${userProvidedPassId} already exists in the database. Please use a new ID.`);
      }

      const existingPassByCnic = await client.fetch('*[_type == "employeePass" && cnic == $cnic][0]', { cnic: validatedData.cnic });
      if (existingPassByCnic) {
        throw new Error(`CNIC ${validatedData.cnic} already exists under a different Pass ID (${existingPassByCnic.passId}).`);
      }
      
      const photoFilenameQuery = `*[_type == "sanity.imageAsset" && (originalFilename match "${userProvidedPassId}.*")][0]`;
      const imageAsset = await client.fetch(photoFilenameQuery);
      
      let photoAssetReference;
      if (imageAsset) {
        photoAssetReference = {
          _type: 'image',
          asset: { _type: 'reference', _ref: imageAsset._id },
        };
      }
      
      const passDocument = {
        _type: 'employeePass',
        passId: userProvidedPassId,
        name: validatedData.name,
        category: validatedData.category,
        designation: validatedData.designation,
        organization: validatedData.organization,
        cnic: validatedData.cnic,
        areaAllowed: validatedData.areaAllowed?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
        ...(photoAssetReference && { photo: photoAssetReference }),
        dateOfEntry: validatedData.dateOfEntry.toISOString().split('T')[0],
        dateOfExpiry: validatedData.dateOfExpiry.toISOString().split('T')[0],
        author: { _type: 'reference', _ref: session.user.id }
      };

      const createdDocument = await client.create(passDocument);
      results.push({ row: excelRowNum, status: 'Success', message: 'Pass created.', documentId: createdDocument._id, passId: userProvidedPassId });
      successCount++;

    } catch (error: unknown) { // <<----- FIX: Changed 'any' to 'unknown'
      let errorMessage = 'An unexpected error occurred.';
      // Check for Zod validation errors first
      if (error instanceof z.ZodError) {
        errorMessage = error.errors.map(e => `${e.path.join('.') || 'Field'}: ${e.message}`).join('; ');
      // Then check for standard JavaScript errors
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      results.push({ row: excelRowNum, status: 'Error', message: errorMessage });
    }
  }

  return NextResponse.json({ 
    message: `Processed ${passes.length} rows. ${successCount} successes, ${passes.length - successCount} errors.`,
    results 
  }, { status: 200 });
}
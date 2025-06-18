//app/api/add-pass/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import type { SanityAssetDocument } from '@sanity/client';

// Zod schema for validation
const addPassSchema = z.object({
  name: z.string().min(3, "Name is required and must be at least 3 characters."),
  designation: z.string().min(2, "Designation is required."),
  organization: z.string().min(2, "Organization is required."),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format. Use XXXXX-XXXXXXX-X."),
  category: z.enum(['cargo', 'landside']),
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected."),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),
});

async function uploadImageBufferToSanity(buffer: Buffer, filename: string): Promise<SanityAssetDocument> {
  return writeClient.assets.upload('image', buffer, { filename });
}

async function getNextPassId(category: 'cargo' | 'landside'): Promise<string> {
  const query = `*[_type == "employeePass" && category == $category] | order(passDocumentCreatedAt desc)[0].passId`;
  const params = { category };
  
  const lastPassIdString = await writeClient.fetch<string | null>(query, params);
  
  let nextNumericId = 1;
  if (lastPassIdString) {
    const lastNumericId = parseInt(lastPassIdString, 10);
    if (!isNaN(lastNumericId)) {
      nextNumericId = lastNumericId + 1;
    }
  }
  
  return String(nextNumericId).padStart(4, '0');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    
    const dataToValidate = {
      name: formData.get('name'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      cnic: formData.get('cnic'),
      category: formData.get('category'),
      areaAllowed: formData.getAll('areaAllowed'),
      dateOfEntry: formData.get('dateOfEntry'),
      dateOfExpiry: formData.get('dateOfExpiry'),
    };

    const validationResult = addPassSchema.safeParse(dataToValidate);
    
    if (!validationResult.success) {
      console.error("Zod Validation Failed:", validationResult.error.flatten());
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
    }

    const validatedData = validationResult.data;
    const photoFile = formData.get('photo') as File | null;

    if (!photoFile) {
        return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }
    
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
    const photoAsset = await uploadImageBufferToSanity(photoBuffer, photoFile.name);
    
    const newPassId = await getNextPassId(validatedData.category);

    const passDocument = {
      _type: 'employeePass',
      ...validatedData,
      passId: newPassId,
      author: { _type: 'reference', _ref: session.user.id },
      photo: { _type: 'image', asset: { _type: 'reference', _ref: photoAsset._id } },
      passDocumentCreatedAt: new Date().toISOString(),
    };

    const createdDocument = await writeClient.create(passDocument);

    return NextResponse.json({ 
        message: "Pass created successfully.", 
        pass: { ...createdDocument, passId: newPassId }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Error in /api/add-pass:", error);

    // Type-safe error handling for Sanity errors
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as Record<string, unknown>).response === 'object' &&
      (error as Record<string, unknown>).response !== null &&
      'body' in ((error as Record<string, unknown>).response as Record<string, unknown>)
    ) {
      console.error("Sanity error details:", ((error as Record<string, unknown>).response as Record<string, unknown>).body);
    }

    let errorMessage = "An internal server error occurred.";
    // Use a type guard to safely access the error message
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
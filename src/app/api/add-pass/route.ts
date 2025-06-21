// /app/api/add-pass/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import { getNextPassId } from '../passes/logic';

const addPassSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  designation: z.string().min(2, "Designation is required."),
  organization: z.string().min(2, "Organization is required."),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format."),
  category: z.enum(['cargo', 'landside']),
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected."),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const validationResult = addPassSchema.safeParse({
      name: formData.get('name'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      cnic: formData.get('cnic'),
      category: formData.get('category'),
      areaAllowed: formData.getAll('areaAllowed'),
      dateOfEntry: formData.get('dateOfEntry'),
      dateOfExpiry: formData.get('dateOfExpiry'),
    });

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
    }

    const { data: validatedData } = validationResult;
    const photoFile = formData.get('photo') as File | null;
    
    // Photo is now optional - removed the required validation

    // *** ADD THIS: Check for duplicate CNIC before creating the document ***
    const existingPass = await writeClient.fetch(
      `*[_type == "employeePass" && cnic == $cnic][0]._id`,
      { cnic: validatedData.cnic }
    );

    if (existingPass) {
      return NextResponse.json({ 
        error: "This CNIC already exists in the system." 
      }, { status: 400 });
    }

    // *** ADD THIS: Check for duplicate Pass ID (extra safety) ***
    const newPassId = await getNextPassId(validatedData.category);
    const existingPassId = await writeClient.fetch(
      `*[_type == "employeePass" && category == $category && passId == $passId][0]._id`,
      { category: validatedData.category, passId: newPassId }
    );

    if (existingPassId) {
      return NextResponse.json({ 
        error: `Pass ID ${newPassId} already exists for the '${validatedData.category}' category.` 
      }, { status: 400 });
    }

    // Handle photo upload only if a photo is provided
    let photoAsset = null;
    if (photoFile && photoFile.size > 0) {
      photoAsset = await writeClient.assets.upload('image', photoFile, { filename: photoFile.name });
    }

    const passDocument = {
      _type: 'employeePass',
      ...validatedData,
      passId: newPassId,
      author: { _type: 'reference', _ref: session.user.id },
      // Only add photo field if photo is provided
      ...(photoAsset && { photo: { _type: 'image', asset: { _type: 'reference', _ref: photoAsset._id } } }),
    };

    const createdDocument = await writeClient.create(passDocument);

    return NextResponse.json({ message: "Pass created successfully.", pass: createdDocument }, { status: 201 });

  } catch (error) {
    console.error("Error in /api/add-pass:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
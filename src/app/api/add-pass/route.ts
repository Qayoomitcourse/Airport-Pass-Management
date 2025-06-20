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
    if (!photoFile) {
      return NextResponse.json({ error: "Photo is required for new passes." }, { status: 400 });
    }

    const newPassId = await getNextPassId(validatedData.category);
    const photoAsset = await writeClient.assets.upload('image', photoFile, { filename: photoFile.name });

    const passDocument = {
      _type: 'employeePass',
      ...validatedData,
      passId: newPassId,
      author: { _type: 'reference', _ref: session.user.id },
      photo: { _type: 'image', asset: { _type: 'reference', _ref: photoAsset._id } },
    };

    const createdDocument = await writeClient.create(passDocument);

    return NextResponse.json({ message: "Pass created successfully.", pass: createdDocument }, { status: 201 });

  } catch (error) {
    console.error("Error in /api/add-pass:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
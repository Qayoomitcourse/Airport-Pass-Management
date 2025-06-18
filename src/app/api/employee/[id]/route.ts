import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";;
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import type { SanityAssetDocument } from '@sanity/client';

// Zod schema for validation. Fields are optional for a PATCH operation, except for the ID.
const updatePassSchema = z.object({
  id: z.string().min(1, "Document ID is required for an update."),
  name: z.string().min(3, "Name must be at least 3 characters.").optional(),
  designation: z.string().min(2, "Designation is required.").optional(),
  organization: z.string().min(2, "Organization is required.").optional(),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format.").optional(),
  category: z.enum(['cargo', 'landside']).optional(),
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected.").optional(),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date.").optional(),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date.").optional(),
});

// Helper function to upload an image to Sanity
async function uploadImageBufferToSanity(buffer: Buffer, filename: string): Promise<SanityAssetDocument> {
  return writeClient.assets.upload('image', buffer, { filename });
}

// PATCH endpoint to update a pass
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    const dataToValidate: Partial<Record<string, FormDataEntryValue | FormDataEntryValue[]>> = {};
    for (const key of updatePassSchema.keyof()._def.values) {
      if (formData.has(key)) {
        dataToValidate[key] = key === 'areaAllowed' ? formData.getAll(key) : formData.get(key);
      }
    }

    const validationResult = updatePassSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validationResult.data;

    // Authorization check: Ensure user is admin or the original author of the pass
    const passToUpdate = await writeClient.fetch(
      `*[_id == $id][0]{ 'authorId': author._ref }`,
      { id }
    );

    if (!passToUpdate) {
      return NextResponse.json({ error: "Pass not found." }, { status: 404 });
    }

    const isAdmin = session.user.role === 'admin';
    const isAuthor = passToUpdate.authorId === session.user.id;
    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden: You are not the owner or an admin.' }, { status: 403 });
    }

    const photoFile = formData.get('photo') as File | null;
    const patchData: Record<string, unknown> = { ...updateData };

    // Upload and attach photo if provided
    if (photoFile) {
      const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
      const photoAsset = await uploadImageBufferToSanity(photoBuffer, photoFile.name);
      patchData.photo = {
        _type: 'image',
        asset: { _type: 'reference', _ref: photoAsset._id },
      };
    }

    // Update the document in Sanity
    const updatedDocument = await writeClient
      .patch(id)
      .set(patchData)
      .commit();

    return NextResponse.json(
      { message: "Pass updated successfully.", pass: updatedDocument },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("Error in /api/update-pass:", error);

    const message = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

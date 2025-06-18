// /app/api/upload-image-asset/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";;

export async function POST(req: NextRequest) {
  // 1. Authenticate the user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // 2. Get the file from the incoming request
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // 3. Convert the file to a buffer to be uploaded
    const fileBuffer = await file.arrayBuffer();

    // 4. Use the Sanity client to upload the image asset
    // We pass the original filename so we can query for it later.
    const imageAsset = await client.assets.upload('image', Buffer.from(fileBuffer), {
      filename: file.name,
    });

    // 5. Return a success response
    return NextResponse.json({
      message: 'Image uploaded successfully',
      assetId: imageAsset._id,
      filename: imageAsset.originalFilename,
    }, { status: 201 });

  } catch (error) { // <-- CHANGE IS HERE: Removed ': any'
    console.error("Image upload failed:", error);
    
    // Safely get the error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      error: 'Image upload failed.',
      details: errorMessage, // <-- Use the safe message
    }, { status: 500 });
  }
}
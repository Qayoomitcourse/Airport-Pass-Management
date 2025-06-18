import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";;

interface PatchData {
  name: FormDataEntryValue | null;
  category: FormDataEntryValue | null;
  designation: FormDataEntryValue | null;
  organization: FormDataEntryValue | null;
  cnic: FormDataEntryValue | null;
  dateOfEntry: FormDataEntryValue | null;
  dateOfExpiry: FormDataEntryValue | null;
  areaAllowed: FormDataEntryValue[]; // from getAll()
  author: {
    _type: 'reference';
    _ref: string;
  };
  photo?: {
    _type: 'image';
    asset: {
      _type: 'reference';
      _ref: string;
    };
  };
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const id = formData.get('id') as string;
    const photo = formData.get('photo') as File | null;

    if (!id) {
      return NextResponse.json({ error: 'Document ID is missing' }, { status: 400 });
    }

    const patchData: PatchData = {
      name: formData.get('name'),
      category: formData.get('category'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      cnic: formData.get('cnic'),
      dateOfEntry: formData.get('dateOfEntry'),
      dateOfExpiry: formData.get('dateOfExpiry'),
      areaAllowed: formData.getAll('areaAllowed'),
      author: {
        _type: 'reference',
        _ref: session.user.id,
      },
    };

    if (photo) {
      const photoAsset = await client.assets.upload('image', photo, {
        contentType: photo.type,
        filename: photo.name,
      });

      patchData.photo = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: photoAsset._id,
        },
      };
    }

    const updatedPass = await client
      .patch(id)
      .set(patchData)
      .commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ message: 'Pass updated successfully', pass: updatedPass }, { status: 200 });

  } catch (error) {
    console.error('Error updating pass:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to update pass', details: errorMessage }, { status: 500 });
  }
}

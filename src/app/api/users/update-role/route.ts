// /app/api/users/update-role/route.ts
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from "@/app/lib/auth";;
import { client } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Secure the API Route: Must be an admin
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, newRole } = await req.json();

    // 2. Validate the input
    if (!userId || !['admin', 'user'].includes(newRole)) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    // 3. Perform the update in Sanity
    await client
      .patch(userId) // Document ID to patch
      .set({ role: newRole }) // The field to update
      .commit(); // Commit the changes

    return NextResponse.json({ message: 'User role updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
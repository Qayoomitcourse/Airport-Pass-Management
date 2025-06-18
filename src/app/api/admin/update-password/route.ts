// /app/api/admin/update-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";;
import bcrypt from 'bcryptjs';
import { serverWriteClient } from '@/sanity/lib/serverClient'; // Adjust path if needed

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Security: Must be an admin
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, newPassword } = await req.json();

    // 1. Validate Input
    if (!userId || !newPassword) {
      return NextResponse.json({ message: 'User ID and new password are required.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // 2. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update the user document in Sanity
    await serverWriteClient
      .patch(userId) // The ID of the document to patch
      .set({ hashedPassword: hashedPassword }) // The field to update
      .commit(); // Commit the changes

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
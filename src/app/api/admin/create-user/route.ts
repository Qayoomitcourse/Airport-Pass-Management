// /app/api/admin/create-user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";;
import bcrypt from 'bcryptjs'; // Using bcryptjs is a safe choice to avoid native compilation issues

// ============================= THE KEY FIX =============================
//
// 1. IMPORT THE CORRECT CLIENT
// Ensure this path points to the file where you defined `serverWriteClient`.
// It might be '@/sanity/client' or '@/lib/sanity.ts' or similar.
//
import { serverWriteClient } from '@/sanity/lib/serverClient'; 
//
// ========================================================================


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Security: Only allow admins to access this endpoint
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await req.json();

    // Validate the incoming data
    if (!name || !email || !password || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ message: 'Missing required fields: name, email, password, and role are required.' }, { status: 400 });
    }

    // 2. USE THE WRITE CLIENT TO CHECK FOR EXISTING USERS
    const existingUser = await serverWriteClient.fetch(
      `*[_type == "user" && email == $email][0]`, 
      { email }
    );

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 }); // 409 Conflict is a more appropriate status code
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare the new user document for Sanity
    const newUser = {
      _type: 'user' as const,
      name,
      email,
      hashedPassword,
      role,
      provider: 'credentials',
      image: '', // No image for credentialed users initially
      requiresPasswordChange: false, // Default value
    };
    
    // 3. USE THE WRITE CLIENT TO CREATE THE NEW USER
    const createdUser = await serverWriteClient.create(newUser);

    // Return the newly created user with a 201 Created status
    return NextResponse.json(createdUser, { status: 201 });

  } catch (error) {
    // Log the full error to the server console for debugging
    console.error('Error creating user:', error);
    // Return a generic error message to the client
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
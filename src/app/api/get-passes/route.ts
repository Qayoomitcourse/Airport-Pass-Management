// /app/api/get-passes/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth'; // Adjust path to your authOptions file if needed
import { client } from '@/sanity/lib/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  // ===================== THE SECURITY FIX =====================
  // 1. Get the server-side session
  const session = await getServerSession(authOptions);

  // 2. If no session exists (user is not logged in), deny access
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ==========================================================

  try {
    // Your GROQ query is perfect. It fetches all fields, expands the author
    // reference to get the user's name, and sorts by creation date.
    const query = `*[_type == "employeePass"]{
      ...,
      author->{_id, name}
    } | order(_createdAt desc)`;

    const passes = await client.fetch(query);
    return NextResponse.json(passes);

  } catch (error) {
    console.error('Failed to fetch passes:', error);
    // Your error handling is also excellent.
    return NextResponse.json({ error: 'Failed to fetch data from the database.' }, { status: 500 });
  }
}
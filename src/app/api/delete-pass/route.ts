// app/api/delete-pass/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";;

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized. You must be logged in.' }, { status: 401 });
  }

  let passIdToDelete: string = '';
  try {
    const rawBody = await request.text();
    const parsed = JSON.parse(rawBody);
    passIdToDelete = parsed.id;

    if (!passIdToDelete) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: 'Invalid request body. Expected JSON with `id` field.' },
      { status: 400 }
    );
  }

  try {
    const pass = await serverWriteClient.fetch(
      `*[_type == "employeePass" && _id == $passIdToDelete][0]{ 'authorId': author._ref }`,
      { passIdToDelete }
    );

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found.' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'admin';
    const isAuthor = pass.authorId === session.user.id;

    if (pass.authorId && !isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden. Not the owner or admin.' }, { status: 403 });
    }

    if (!pass.authorId && !isAdmin) {
      return NextResponse.json({ error: 'Only admin can delete legacy (unauthored) passes.' }, { status: 403 });
    }

    await serverWriteClient.delete(passIdToDelete);

    return NextResponse.json({ success: true, message: `Pass ${passIdToDelete} deleted.` });
  } catch (error: unknown) { // <-- FIX: Changed 'any' to 'unknown'
    console.error('Delete API error:', error);
    
    // Safely determine the error details
    const details = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: 'Internal server error.', details }, // <-- Use the safely determined details
      { status: 500 }
    );
  }
}
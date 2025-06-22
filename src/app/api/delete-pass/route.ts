import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';

const deleteRequestSchema = z.object({
  id: z.string().min(1, "Pass ID is required."),
});

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const validation = deleteRequestSchema.safeParse(requestBody);
  if (!validation.success) {
    return NextResponse.json({ 
      error: "Invalid request body.", 
      details: validation.error.flatten() 
    }, { status: 400 });
  }

  const { id: passId } = validation.data;
  
  try {
    const pass = await serverWriteClient.fetch<{ _id: string, authorId: string | null } | null>(
      `*[_type == "employeePass" && _id == $passId][0]{ _id, "authorId": author._ref }`,
      { passId }
    );

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found.' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'admin';
    const isAuthor = pass.authorId === session.user.id;
    
    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ 
        error: 'Forbidden. You do not have permission to delete this pass.' 
      }, { status: 403 });
    }

    await serverWriteClient.delete(passId);

    return NextResponse.json({
      success: true,
      message: 'Pass deleted successfully.'
    });

  } catch (error: unknown) {
    console.error('Delete API error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal server error.', details }, { status: 500 });
  }
}
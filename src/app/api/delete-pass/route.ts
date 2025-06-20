// /app/api/delete-pass/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';

const deleteRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one ID is required."),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validation = deleteRequestSchema.safeParse(await request.json());
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request body.", details: validation.error.flatten() }, { status: 400 });
  }

  const { ids: passIdsToDelete } = validation.data;
  
  try {
    const passes = await serverWriteClient.fetch<Array<{ _id: string, authorId: string | null }>>(
      `*[_type == "employeePass" && _id in $passIdsToDelete]{ _id, "authorId": author._ref }`,
      { passIdsToDelete }
    );

    if (passes.length === 0) {
      return NextResponse.json({ error: 'No matching passes found to delete.' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'admin';
    const permittedIdsToDelete: string[] = [];
    
    for (const pass of passes) {
      const isAuthor = pass.authorId === session.user.id;
      if (isAdmin || isAuthor) {
        permittedIdsToDelete.push(pass._id);
      }
    }

    if (permittedIdsToDelete.length === 0) {
      return NextResponse.json({ error: 'Forbidden. You do not have permission to delete any of the selected passes.' }, { status: 403 });
    }

    let transaction = serverWriteClient.transaction();
    permittedIdsToDelete.forEach(id => {
      transaction = transaction.delete(id);
    });
    
    await transaction.commit();
    const skippedCount = passIdsToDelete.length - permittedIdsToDelete.length;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${permittedIdsToDelete.length} pass(es).`,
      details: skippedCount > 0 ? `${skippedCount} pass(es) were skipped due to lack of permissions.` : ''
    });

  } catch (error: unknown) {
    console.error('Delete API error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal server error.', details }, { status: 500 });
  }
}
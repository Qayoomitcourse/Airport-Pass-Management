import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { serverWriteClient } from '@/sanity/lib/serverClient';

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });
    }

    if (session.user.id === userId) {
      return NextResponse.json({ message: 'You cannot delete your own account' }, { status: 400 });
    }

    // ✅ Check if the user is referenced in pass documents (author._ref)
    const referencingDocs = await serverWriteClient.fetch(
      `*[_type == "pass" && author._ref == $userId]{ _id, _type }`,
      { userId }
    );

    if (referencingDocs.length > 0) {
      const refList = referencingDocs.map((r: { _id: string; _type: string }) => `${r._type} (${r._id})`).join(', ');
      return NextResponse.json(
        { message: `Cannot delete user. Referenced in: ${refList}` },
        { status: 409 }
      );
    }

    // ✅ Safe to delete
    await serverWriteClient.delete(userId);

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Delete error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

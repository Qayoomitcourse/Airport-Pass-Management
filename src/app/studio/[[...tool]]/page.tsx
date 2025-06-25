import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import StudioWrapper from './StudioWrapper'; // ⬅️ Client component

export const dynamic = 'force-dynamic'; // Required for SSR compatibility

export default async function StudioPage() {
  const session = await getServerSession(authOptions);

  // Only admins can access Studio
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <StudioWrapper />;
}

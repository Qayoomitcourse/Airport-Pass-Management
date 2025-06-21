import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth'; // Update with your auth path
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

export const dynamic = 'force-static';
export { metadata, viewport } from 'next-sanity/studio';

export default async function StudioPage() {
  const session = await getServerSession(authOptions);

  // 🔐 Only allow access to admin users
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <NextStudio config={config} />;
}

// /app/admin/users/page.tsx

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

// Import the components for this page
import { CreateUserForm } from '@/app/components/CreateUserForm';
import { UserList } from '@/app/components/UserList'; // Import the new component

// Import your Sanity client with write/read access
import { serverWriteClient } from '@/sanity/lib/serverClient'; // Adjust path if needed

// Define the User type again for our fetch call
type SanityUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  provider: 'github' | 'credentials';
  _createdAt: string;
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  // Security Guard: Ensure only admins can see this page
  if (session?.user?.role !== 'admin') {
    redirect('/'); 
  }

  // ======================= THE NEW PART =======================
  // Fetch all users from Sanity when the page loads on the server.
  // We order by creation date to see the newest users first.
  const users: SanityUser[] = await serverWriteClient.fetch(
    `*[_type == "user"] | order(_createdAt desc)`
  );
  // ============================================================

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-lg text-gray-600 mb-8">User Management</p>

      {/* Section 1: The form to create a new user (already existed) */}
      <CreateUserForm />

      {/* Section 2: The list of existing users (the new part) */}
      <UserList users={users} />
    </div>
  );
}
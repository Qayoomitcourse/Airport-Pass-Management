// /app/admin/users/page.tsx

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link'; // <--- 1. IMPORT THE LINK COMPONENT

// Import the components for this page
import { CreateUserForm } from '@/app/components/CreateUserForm';
import { UserList } from '@/app/components/UserList'; 

// Import your Sanity client with write/read access
import { serverWriteClient } from '@/sanity/lib/serverClient';

// Define the User type again for our fetch call
type SanityUser = {
  _id: string;
  name: string;
  email:string;
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

  // Fetch all users from Sanity
  const users: SanityUser[] = await serverWriteClient.fetch(
    `*[_type == "user"] | order(_createdAt desc)`
  );

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-lg text-gray-600 mb-8">User & Data Management</p>

      {/* ======================= NEW SECTION WITH THE LINK ======================= */}
      <div className="mb-10 p-4 border border-gray-200 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">Data Management Tools</h2>
        <p className="text-gray-600 mb-4">
          For special administrative tasks like importing historical pass data from an Excel file.
        </p>
        <Link 
          href="/historical-import"
          className="inline-block bg-blue-600 text-white font-medium py-2 px-5 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          Go to Historical Import Page
        </Link>
      </div>
      {/* ======================================================================= */}


      {/* Section 1: The form to create a new user (restructured for clarity) */}
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Create New User</h2>
        <CreateUserForm />
      </div>

      {/* Section 2: The list of existing users (restructured for clarity) */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Manage Existing Users</h2>
        <UserList users={users} />
      </div>
    </div>
  );
}
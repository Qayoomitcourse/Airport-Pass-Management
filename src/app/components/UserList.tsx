// /components/UserList.tsx

import { UserActions } from './UserActions'; // Import the new component

type SanityUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  provider: 'github' | 'credentials';
  _createdAt: string;
};

export function UserList({ users }: { users: SanityUser[] }) {
  if (!users || users.length === 0) {
    return <p className="mt-8 text-center text-gray-500">No users found.</p>;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-4">Existing Users</h2>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-900">Name</th>
              <th className="px-6 py-3 font-medium text-gray-900">Email</th>
              <th className="px-6 py-3 font-medium text-gray-900">Role</th>
              <th className="px-6 py-3 font-medium text-gray-900">Provider</th>
              {/* ===================== NEW COLUMN ===================== */}
              <th className="px-6 py-3 font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-gray-700">{user.email}</td>
                <td className="px-6 py-4 text-gray-700 capitalize">{user.role}</td>
                <td className="px-6 py-4 text-gray-700 capitalize">{user.provider}</td>
                {/* ===================== NEW COLUMN DATA ===================== */}
                <td className="px-6 py-4">
                  {/*
                    This pattern is powerful: a Server Component (UserList)
                    rendering an interactive Client Component (UserActions) for each item.
                  */}
                  <UserActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
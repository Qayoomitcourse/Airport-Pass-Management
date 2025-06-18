'use client';

import { useState } from 'react';

type SanityUser = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

export function UserManagement({ users: initialUsers }: { users: SanityUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    setLoadingId(userId);
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Update the state locally to reflect the change immediately
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Current Role</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td className="py-2 px-4 border-b">{user.name}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b font-semibold">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </td>
              <td className="py-2 px-4 border-b">
                {user.role === 'user' ? (
                  <button
                    onClick={() => handleRoleChange(user._id, 'admin')}
                    disabled={loadingId === user._id}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                  >
                    {loadingId === user._id ? 'Promoting...' : 'Promote to Admin'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChange(user._id, 'user')}
                    disabled={loadingId === user._id}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
                  >
                    {loadingId === user._id ? 'Demoting...' : 'Demote to User'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

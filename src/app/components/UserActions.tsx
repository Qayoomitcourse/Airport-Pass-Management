'use client';

import { useSession } from 'next-auth/react';
import { useState, FormEvent } from 'react';

type User = {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  provider: 'github' | 'credentials';
};

export function UserActions({ user }: { user: User }) {
  const { data: session } = useSession();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isSuperAdmin = session?.user?.provider === 'github';
  const isSelf = session?.user?.email === user.email;

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const res = await fetch('/api/admin/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user._id, newPassword }),
    });

    const data = await res.json();
    setIsLoading(false);

    if (!res.ok) {
      setFeedback({ type: 'error', message: data.message || 'Failed to reset password' });
    } else {
      setFeedback({ type: 'success', message: `Password reset for ${user.name}` });
      setNewPassword('');
      setTimeout(() => {
        setIsModalOpen(false);
        setFeedback(null);
      }, 2000);
    }
  };

  const handleDelete = async () => {
    if (isSelf) {
      alert('You cannot delete yourself.');
      return;
    }

    if (user.role === 'admin' && !isSuperAdmin) {
      alert('Only social login (GitHub) admins can delete another admin.');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        body: JSON.stringify({ userId: user._id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to delete user.');
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error deleting user.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {user.provider === 'credentials' ? (
        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded"
          >
            Reset Password
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-bold py-1 px-2 rounded border text-red-600 border-red-600 hover:bg-red-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <span className="text-xs text-gray-400">Social Login</span>

          {user.role === 'admin' && isSuperAdmin && !isSelf && (
            <button
              onClick={handleDelete}
              className="text-xs font-bold py-1 px-2 rounded border text-red-600 border-red-600 hover:bg-red-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-md w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reset Password for {user.name}</h3>
            <form onSubmit={handlePasswordReset}>
              <label className="block text-sm mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full mb-4 px-3 py-2 border border-gray-300 rounded"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
            {feedback && (
              <p className={`text-sm mt-3 ${feedback.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {feedback.message}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

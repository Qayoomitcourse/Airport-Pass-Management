// /components/UserActions.tsx

'use client';

import { useState, FormEvent, Fragment } from 'react';

// Define the user type to be passed as a prop
type User = {
  _id: string;
  name: string;
  provider: 'github' | 'credentials';
};

export function UserActions({ user }: { user: User }) {
  // State to control the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  // State for API feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Don't allow password reset for GitHub users
  if (user.provider !== 'credentials') {
    return <span className="text-xs text-gray-400">Social Login</span>;
  }
  
  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
        setError(data.message || "Failed to update password.");
    } else {
        setSuccess(`Password for ${user.name} has been updated.`);
        setNewPassword(''); // Clear password field
        // Optionally close modal after a short delay
        setTimeout(() => {
            setIsModalOpen(false);
            setSuccess(null);
        }, 2000);
    }

    setIsLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded"
      >
        Reset Password
      </button>

      {/* The Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reset Password for {user.name}</h3>
            <form onSubmit={handlePasswordReset}>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    required
                    minLength={8}
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50">
                        {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </form>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
          </div>
        </div>
      )}
    </>
  );
}
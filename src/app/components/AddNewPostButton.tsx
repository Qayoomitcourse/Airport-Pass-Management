// /components/AddNewPostButton.tsx

'use client';

import { useSession } from 'next-auth/react';

export function AddNewPostButton() {
  const { data: session } = useSession();

  // Determine if user has "add" permissions
  const canAdd = session?.user?.role === 'admin' || session?.user?.role === 'editor';

  if (!canAdd) {
    return null; // Don't render the button for viewers
  }

  return (
    <button className="bg-blue-500 text-white p-2 rounded">
      Add New Post
    </button>
  );
}
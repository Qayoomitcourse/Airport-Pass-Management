'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function LoginStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-[88px] text-center">...</div>; // Placeholder to prevent layout shift
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        {/* Optional: show user's name on larger screens */}
        <span className="text-white hidden sm:block">
          {session.user?.name}
        </span>
        <button
          onClick={() => signOut()}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('github')} // Or your chosen provider
      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
    >
      Sign In
    </button>
  );
}
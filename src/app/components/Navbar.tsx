// /components/Navbar.tsx

'use client'; // This is crucial! It marks this as a Client Component.

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';

export function Navbar() {
  // The useSession hook provides session data on the client.
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and Title Link */}
        <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 transform group-hover:scale-110 transition-transform duration-200">
            <Image
              src="/logo.png"
              alt="Airport Pass System Logo"
              fill
              style={{ objectFit: 'contain' }}
              sizes="(max-width: 640px) 32px, 40px"
              priority
            />
          </div>
          <span className="text-lg sm:text-xl font-bold group-hover:text-blue-200 transition-colors">
            Pakistan Airport Authority Vigilance Branch, JIAP
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base">
          <Link href="/" className="hover:text-blue-200 transition-colors">
            Home
          </Link>
          <Link href="/add-pass" className="hover:text-blue-200 transition-colors">
            Add Pass
          </Link>
          <Link href="/database" className="hover:text-blue-200 transition-colors">
            Database
          </Link>

          {/* ===================== THE UPDATE IS HERE ===================== */}
          {/* Conditionally render the Admin link based on the user's role */}
          {isAdmin && (
            <Link href="/admin/users" className="bg-yellow-400 text-black font-bold px-3 py-1 rounded hover:bg-yellow-300 transition-colors">
              Admin
            </Link>
          )}

          {/* Login/Logout Status Logic */}
          {status === 'loading' ? (
            <div className="w-24 h-8 bg-blue-500 rounded animate-pulse"></div>
          ) : session ? (
            <>
              <span className="hidden sm:inline">{session.user?.name}</span>
              <button onClick={() => signOut()} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition-colors">Sign Out</button>
            </>
          ) : (
            <button onClick={() => signIn()} className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded transition-colors">Sign In</button>
          )}
          {/* ============================================================= */}
        </div>
      </div>
    </nav>
  );
}
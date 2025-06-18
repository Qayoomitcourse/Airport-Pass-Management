// app/components/SignInButton.tsx
// CHANGE: Remove 'use client' and signIn import, as we are just navigating.
import Link from 'next/link';

export default function SignInButton() {
  return (
    // CHANGE: This is now a Link component pointing to your login page.
    <Link
      href="/login" 
      className="inline-block bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
    >
      Sign In
    </Link>
  );
}
// /app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaGithub } from 'react-icons/fa'; // Using react-icons for the GitHub logo

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State for loading and error messages
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for error messages from NextAuth in the URL
  useEffect(() => {
    const callbackError = searchParams.get('error');
    if (callbackError) {
      // Map common NextAuth errors to more user-friendly messages
      switch (callbackError) {
        case 'CredentialsSignin':
          setError('Invalid email or password. Please try again.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
      }
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setIsLoading(true);

    // This is the core of the client-side authentication logic
    const result = await signIn('credentials', {
      redirect: false, // IMPORTANT: Do not redirect, we will handle it manually
      email,
      password,
    });

    setIsLoading(false);

    if (result?.error) {
      // The `authorize` function in your API route threw an error.
      // We can display this error message to the user.
      setError(result.error);
    } else if (result?.ok) {
      // Login was successful! Redirect to the dashboard or home page.
      router.push('/dashboard'); // Change '/dashboard' to your desired protected route
      router.refresh(); // Recommended to refresh server components and get new session data
    }
  };
  
  const handleGitHubSignIn = () => {
    setIsLoading(true);
    // When signing in with a provider like GitHub, NextAuth handles the redirect flow.
    // You don't need `redirect: false`.
    signIn('github', { callbackUrl: '/dashboard' }); // Redirect to dashboard after success
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Sign In
        </h2>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 flex-shrink text-sm text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* GitHub Sign-In Button */}
        <div>
           <button
             onClick={handleGitHubSignIn}
             disabled={isLoading}
             className="group relative flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-200"
           >
             <FaGithub className="mr-2 h-5 w-5" aria-hidden="true" />
             Sign in with GitHub
           </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
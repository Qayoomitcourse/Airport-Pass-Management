'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function UnauthorizedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to home
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent absolute top-0"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const getUserAllowedPages = (role: string) => {
    switch (role) {
      case 'admin':
        return [
          { name: 'Database', href: '/database', icon: '🗄️' },
          { name: 'Add Pass', href: '/add-pass', icon: '➕' },
          { name: 'Admin Panel', href: '/admin', icon: '⚙️' },
        ];
      case 'user':
      case 'editor':
        return [
          { name: 'Database', href: '/database', icon: '🗄️' },
          { name: 'Add Pass', href: '/add-pass', icon: '➕' },
        ];
      default:
        return [];
    }
  };

  const allowedPages = session?.user?.role ? getUserAllowedPages(session.user.role) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl w-full">
          <div className="bg-gradient-to-r from-red-500 via-red-600 to-rose-600 px-8 py-12 relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-12 translate-y-12"></div>
            
            <div className="relative z-10 text-center">
              <div className="bg-white bg-opacity-20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-5V9a3 3 0 00-6 0v3m0 1.5A1.5 1.5 0 004.5 15v2A1.5 1.5 0 006 18.5h12a1.5 1.5 0 001.5-1.5v-2a1.5 1.5 0 00-1.5-1.5V9a3 3 0 00-6 0v3" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">Access Denied</h1>

              {/* --- THE DEFINITIVE FIX IS HERE --- */}
              {/* This comment tells ESLint and formatters to ignore the rule for the next line. */}
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <p className="text-xl text-red-100 mb-2">You don't have permission to access this page</p>

              {session?.user?.role && (
                <p className="text-red-200 text-lg">
                  Current Role: <span className="font-semibold capitalize">{session.user.role}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What you can do:</h2>
              <p className="text-gray-600 mb-6">
                Based on your current role, here are the pages you have access to:
              </p>
            </div>

            {allowedPages.length > 0 ? (
              <div className="space-y-4 mb-8">
                {allowedPages.map((page, index) => (
                  <Link
                    key={index}
                    href={page.href}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 transform hover:scale-[1.02] group"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{page.icon}</span>
                      <span className="font-semibold text-gray-900 group-hover:text-blue-600">
                        {page.name}
                      </span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center mb-8">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6">
                  <p className="text-gray-500 font-medium">No accessible pages found</p>
                  <p className="text-sm text-gray-400 mt-1">Please contact your administrator</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 transform hover:scale-105 font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Go Back</span>
              </button>
              
              <Link
                href="/database"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <span>Go to Database</span>
              </Link>
            </div>

            {session?.user?.role !== 'admin' && (
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">Need more access?</h4>
                    <p className="text-sm text-yellow-700">
                      Contact your system administrator to request additional permissions or role changes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
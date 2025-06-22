// /components/Navbar.tsx

'use client'; 

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';

export function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when clicking outside or on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      const navbar = document.querySelector('[data-navbar]');
      if (navbar && !navbar.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md sticky top-0 z-50" data-navbar>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        {/* Main navbar content */}
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title Link */}
          <Link 
            href="/" 
            className="flex items-center space-x-2 group min-w-0 flex-1 sm:flex-initial" 
            onClick={handleLinkClick}
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex-shrink-0 transform group-hover:scale-110 transition-transform duration-200">
              <Image
                src="/logo.png"
                alt="Airport Pass System Logo"
                fill
                style={{ objectFit: 'contain' }}
                sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 40px"
                priority
              />
            </div>
            <span className="text-sm sm:text-lg md:text-xl font-bold group-hover:text-blue-200 transition-colors truncate">
              <span className="hidden sm:inline">Pakistan Airport Authority Vigilance Branch, JIAP</span>
              <span className="sm:hidden">PAA Vigilance</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-4 text-sm">
            <Link href="/" className="hover:text-blue-200 transition-colors px-2 py-1">Home</Link>
            <Link href="/add-pass" className="hover:text-blue-200 transition-colors px-2 py-1">Add Pass</Link>
            <Link href="/database" className="hover:text-blue-200 transition-colors px-2 py-1">Database</Link>
            
            {isAdmin && (
              <Link href="/admin/users" className="bg-yellow-400 text-black font-bold px-3 py-1 rounded hover:bg-yellow-300 transition-colors">
                Admin
              </Link>
            )}

            {status === 'loading' ? (
              <div className="w-20 h-8 bg-blue-500 rounded animate-pulse"></div>
            ) : session ? (
              <>
                <span className="hidden xl:inline text-xs max-w-32 truncate">{session.user?.name}</span>
                <button 
                  onClick={() => signOut()} 
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition-colors text-xs"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={() => signIn()} 
                className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded transition-colors text-xs"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <div className="w-5 h-5 relative">
              {/* Animated hamburger/close icon */}
              <span className={`absolute top-0 left-0 w-full h-0.5 bg-white transform transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`absolute top-2 left-0 w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`absolute top-4 left-0 w-full h-0.5 bg-white transform transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen 
            ? 'max-h-96 opacity-100 pb-4' 
            : 'max-h-0 opacity-0 pb-0 overflow-hidden'
        }`}>
          <div className="border-t border-blue-500 pt-4">
            <div className="flex flex-col space-y-1">
              <Link 
                href="/" 
                onClick={handleLinkClick} 
                className="block py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🏠 Home
              </Link>
              <Link 
                href="/add-pass" 
                onClick={handleLinkClick} 
                className="block py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                ➕ Add Pass
              </Link>
              <Link 
                href="/database" 
                onClick={handleLinkClick} 
                className="block py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🗃️ Database
              </Link>

              {isAdmin && (
                <Link 
                  href="/admin/users" 
                  onClick={handleLinkClick} 
                  className="block py-3 px-4 rounded-md bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors text-sm"
                >
                  ⚙️ Admin Panel
                </Link>
              )}

              {/* User section */}
              <div className="border-t border-blue-500 pt-4 mt-4">
                {status === 'loading' ? (
                  <div className="h-12 bg-blue-700 rounded-md animate-pulse"></div>
                ) : session ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2 bg-blue-700 rounded-md">
                      <div className="text-xs text-blue-200">Signed in as:</div>
                      <div className="text-sm font-medium truncate">{session.user?.name || session.user?.email}</div>
                    </div>
                    <button
                      onClick={() => { handleLinkClick(); signOut(); }}
                      className="w-full text-left py-3 px-4 rounded-md bg-red-500 hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { handleLinkClick(); signIn(); }}
                    className="w-full text-left py-3 px-4 rounded-md bg-green-500 hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    🔑 Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
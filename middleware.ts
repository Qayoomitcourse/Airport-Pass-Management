// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Get the user's session token to check their login status and role
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Get the path the user is trying to access
  const { pathname } = req.nextUrl;

  // --- DEFINE YOUR PUBLIC PATHS (accessible without authentication) ---
  const publicPaths = [
    '/cargo-id',   
    '/landside-id', 
    '/',            
  ];

  // --- CHECK IF THE PATH IS PUBLIC ---
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // --- CHECK IF THE USER IS LOGGED IN ---
  // If the path is not public, we must have a logged-in user.
  if (!token) {
    const url = new URL('/', req.url); // Redirect to the home/login page
    return NextResponse.redirect(url);
  }

  // ===================================================================
  // --- ROLE-BASED ACCESS CONTROL ---
  // At this point, we know the user is logged in.
  // ===================================================================

  const userRole = token.role as string;

  // --- SANITY STUDIO SPECIFIC ACCESS CONTROL ---
  // Check for Sanity Studio access first (more specific than general admin check)
  if (pathname.startsWith('/studio') || pathname.startsWith('/admin/studio') || pathname.startsWith('/cms') || pathname.startsWith('/sanity')) {
    // Only allow admin or specific CMS editors to access Sanity Studio
    if (!['admin', 'cms-editor', 'content-manager'].includes(userRole)) {
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // --- ADMIN FULL ACCESS ---
  // Admins have access to everything (except Sanity Studio which is handled above)
  if (userRole === 'admin') {
    return NextResponse.next();
  }

  // --- USER RESTRICTED ACCESS ---
  // Regular users can only access add-pass and database (no delete functionality)
  
  // 1. Define paths that users can access
  const userAllowedPaths = [
    '/add-pass',
    '/database',
    '/profile',        // Allow profile access
    '/dashboard',      // Allow dashboard access if you have one
    '/unauthorized'    // Allow unauthorized page access
  ];

  // 2. Define paths that contain delete functionality (admin only)
  const deleteRestrictedPaths = [
    '/api/delete',
    '/delete',
    '/api/remove',
    '/remove'
  ];

  // 3. Define admin-only paths (INCLUDING SANITY STUDIO)
  const adminOnlyPaths = [
    '/admin',
    '/settings',
    '/user-management',
    '/reports',
    '/analytics',
    '/studio',         // Add your Sanity Studio path here
    '/admin/studio',   // If your studio is at /admin/studio
    '/cms',           // Alternative common CMS path
    '/sanity'         // Alternative Sanity path
  ];

  // 4. Check if user is trying to access delete functionality
  const isDeletePath = deleteRestrictedPaths.some(path => pathname.startsWith(path));
  if (isDeletePath && userRole !== 'admin') {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // 5. Check if user is trying to access admin-only paths (INCLUDING SANITY STUDIO)
  const isAdminPath = adminOnlyPaths.some(path => pathname.startsWith(path));
  if (isAdminPath && userRole !== 'admin') {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // 6. For non-admin users, check if they're accessing allowed paths
  if (userRole === 'user' || userRole === 'editor' || userRole === 'cms-editor' || userRole === 'content-manager') {
    const isAllowedPath = userAllowedPaths.some(path => pathname.startsWith(path));
    
    if (!isAllowedPath) {
      // If user is trying to access a path not in their allowed list, redirect
      const url = new URL('/unauthorized', req.url);
      return NextResponse.redirect(url);
    }
  }

  // 7. If user role is not recognized, redirect to unauthorized
  if (!['admin', 'user', 'editor', 'cms-editor', 'content-manager'].includes(userRole)) {
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // If all checks pass, allow the user to proceed to their requested page.
  return NextResponse.next();
}

// --- CONFIGURE WHICH PATHS THE MIDDLEWARE RUNS ON ---
export const config = {
  // This matcher runs on all paths except for static/API assets and NextAuth routes
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
};
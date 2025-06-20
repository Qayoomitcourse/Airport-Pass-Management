// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  // Get the user's session token to check their login status and role
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Get the path the user is trying to access
  const { pathname } = req.nextUrl;

  // --- DEFINE YOUR PUBLIC PATHS ---
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
  // --- NEW ROLE-BASED ACCESS CHECKS ---
  // At this point, we know the user is logged in.
  // ===================================================================

  // 1. Define the roles that can access the editor pages
  const authorizedRolesForEditorPages = ['admin', 'editor'];

  // 2. Define the editor-specific pages
  const isEditorPage = pathname.startsWith('/add-pass') || pathname.startsWith('/database');

  // 3. Check if the user is trying to access an editor page
  if (isEditorPage) {
    // If they are on an editor page, check if their role is authorized
    if (!authorizedRolesForEditorPages.includes(token.role as string)) {
      // If their role is not 'admin' or 'editor', redirect them.
      // You can redirect to an "unauthorized" page or the home page.
      const url = new URL('/unauthorized', req.url); 
      return NextResponse.redirect(url);
    }
  }

  // 4. (Optional but recommended) Add specific protection for any other admin-only pages
  const isAdminPath = pathname.startsWith('/admin'); // Example: an /admin dashboard
  if (isAdminPath && token.role !== 'admin') {
    // If a non-admin user tries to access an admin page, redirect them.
    const url = new URL('/unauthorized', req.url);
    return NextResponse.redirect(url);
  }

  // If all checks pass, allow the user to proceed to their requested page.
  return NextResponse.next();
}

// --- CONFIGURE WHICH PATHS THE MIDDLEWARE RUNS ON ---
export const config = {
  // This matcher is good. It runs on all paths except for static/API assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
// /types/next-auth.d.ts

import 'next-auth';
import 'next-auth/jwt';

/**
 * Here, we are "augmenting" the built-in types from NextAuth.
 * This tells TypeScript what the shape of our custom session and token is.
 */

// Extend the built-in session and user types
declare module 'next-auth' {
  /**
   * The `Session` object is what you will get back from `useSession()` or `getServerSession()`.
   * We add our custom properties to the user object within the session.
   */
  interface Session {
    user: {
      id: string;      // The user's ID from Sanity
      role: string;    // The user's role (guaranteed to be a string, not null)
      requiresPasswordChange?: boolean; // Optional flag for forcing password reset
    } & DefaultSession['user']; // This merges with the default properties (name, email, image)
  }

  /**
   * The `User` object is the raw user object returned by a provider's `authorize` or profile function.
   * We can add our custom properties here as well.
   */
  interface User {
    role?: string;
    requiresPasswordChange?: boolean;
  }
}

// Extend the built-in JWT type
declare module 'next-auth/jwt' {
  /**
   * The `JWT` interface is for the token object that is passed between the `jwt` and `session` callbacks.
   * Whatever you put on the token in the `jwt` callback will be available here.
   */
  interface JWT {
    id: string;
    role: string;
    requiresPasswordChange?: boolean;
  }
}
// /lib/auth.ts (create this new file)
import type { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { client, writeClient } from '@/sanity/lib/client';
import bcrypt from 'bcryptjs';

/**
 * Interface to define the shape of a user document coming from Sanity.
 */
interface SanityUser {
  _id: string;
  _type: 'user';
  name: string | null;
  email: string;
  image: string | null;
  role: 'admin' | 'editor' | 'viewer' | null;
  hashedPassword?: string;
  requiresPasswordChange?: boolean;
}

const DEFAULT_ROLE = 'viewer';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Please enter an email and password.');
        }

        const user: SanityUser | null = await client.fetch(
          `*[_type == "user" && email == $email][0]`,
          { email: credentials.email }
        );

        if (!user || !user.hashedPassword) {
          throw new Error('No user found with this email or password.');
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordCorrect) {
          throw new Error('Invalid password.');
        }

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role ?? DEFAULT_ROLE,
          requiresPasswordChange: user.requiresPasswordChange ?? false,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? DEFAULT_ROLE;
        token.requiresPasswordChange = user.requiresPasswordChange ?? false;
        
        if (account?.provider === 'github') {
            const sanityUser: SanityUser | null = await client.fetch(
                `*[_type == "user" && email == $email][0]`,
                { email: user.email }
            );

            if (!sanityUser) {
                const newUser = {
                    _type: 'user' as const,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: DEFAULT_ROLE,
                    provider: 'github',
                    requiresPasswordChange: false,
                };
                const createdUser = await writeClient.create(newUser);
                token.id = createdUser._id;
            } else {
                token.id = sanityUser._id;
                if (sanityUser.image !== user.image) {
                    await writeClient.patch(sanityUser._id).set({ image: user.image }).commit();
                }
            }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.requiresPasswordChange = token.requiresPasswordChange as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
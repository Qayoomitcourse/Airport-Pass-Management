// app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import Provider from './provider'; 
import { Navbar } from '@/app/components/Navbar'; // Import the new Navbar component

export const metadata: Metadata = {
  title: 'Pakistan Airport Authority Pass Management',
  description: 'Manage airport employee passes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-800 flex flex-col min-h-screen">
        <Provider>
          {/*
            The entire navigation bar is now handled by our new Client Component.
            The RootLayout remains a clean Server Component.
          */}
          <Navbar />

          <main className="container mx-auto p-6 flex-grow">{children}</main>

          <footer className="text-center p-4 text-gray-600 text-sm bg-gray-200">
            © {new Date().getFullYear()} Pakistan Airport Authority
          </footer>
        </Provider>
      </body>
    </html>
  );
}
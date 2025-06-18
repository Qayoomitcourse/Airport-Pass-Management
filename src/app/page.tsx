// app/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/app/lib/auth";
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import SignOutButton from '@/app/components/SignOutButton'

// Heroicon imports
import { PlusCircleIcon, CircleStackIcon, PrinterIcon, ArrowRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'; // <-- FIX: UserIcon removed
import SignInButton from '@/app/components/SignInButton';

// 1. NEW: Define a type for our counts for better code safety
interface PassCounts {
  total: number;
  cargo: number;
  landside: number;
}

// 2. MODIFIED: This new function fetches all counts in a single, efficient query
async function getPassCountsByCategory(): Promise<PassCounts> {
  try {
    // This GROQ query fetches three separate counts and returns them in one object.
    // IMPORTANT: This assumes you have a field named 'category' in your Sanity schema
    // with values 'cargo' and 'landside'. If your field is named differently,
    // e.g., 'passType', change "category" to "passType" in the query below.
    const query = `
      {
        "total": count(*[_type == "employeePass"]),
        "cargo": count(*[_type == "employeePass" && category == "cargo"]),
        "landside": count(*[_type == "employeePass" && category == "landside"])
      }
    `;
    
    const counts = await client.fetch<PassCounts>(query);
    
    // Return the fetched counts, or a default object with zeros if something goes wrong
    return counts || { total: 0, cargo: 0, landside: 0 };
  } catch (error) {
    console.error("Failed to fetch pass counts from Sanity:", error);
    // Return a default object on error
    return { total: 0, cargo: 0, landside: 0 };
  }
}

interface Feature {
  name: string;
  href: string;
  description: string;
  icon: React.ElementType;
  bgColorClass: string;
  textColorClass: string;
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

function LoggedOutView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-slate-800 dark:text-sky-400">Welcome to the Airport Pass System</h1>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
        Please sign in to manage employee passes.
      </p>
      <div className="mt-8">
        <SignInButton />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user) {
    return <LoggedOutView />;
  }

  // 3. UPDATED: Call the new function and store the result object
  const passCounts = await getPassCountsByCategory();

  const features: Feature[] = [
    { 
      name: 'Add New Pass', 
      href: '/add-pass',
      description: 'Create a new employee pass record.',
      icon: PlusCircleIcon,
      bgColorClass: 'bg-green-100 dark:bg-green-900/50',
      textColorClass: 'text-green-600 dark:text-green-400',
    },
     { 
      name: 'Upload Excel Sheet', 
      href: '/bulk-add-passes',
      description: 'Create Multiple Passes .',
      icon: PlusCircleIcon,
      bgColorClass: 'bg-green-100 dark:bg-green-900/50',
      textColorClass: 'text-green-600 dark:text-green-400',
    },
    { 
      name: 'View Database', 
      href: '/database',
      description: 'Browse, search, and manage all existing passes.',
      icon: CircleStackIcon,
      bgColorClass: 'bg-blue-100 dark:bg-blue-900/50',
      textColorClass: 'text-blue-600 dark:text-blue-400',
    },
    { 
      name: 'ID Card Gallery & Print', 
      href: '/print-prev',
      description: 'View, select, and print official ID cards.',
      icon: PrinterIcon,
      bgColorClass: 'bg-purple-100 dark:bg-purple-900/50',
      textColorClass: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 p-4 sm:p-8">
       <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800 dark:text-sky-400">
              Airport Pass Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-md mt-1">
              Welcome, <span className="font-semibold text-sky-600 dark:text-sky-300">{user.name || user.email || 'User'}</span>!
            </p>
          </div>
          <div className="text-right">
            <SignOutButton />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.href}
              className="group block transform transition-all duration-300 hover:scale-[1.03]"
            >
              <div className="relative h-full p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-sky-500/70 dark:hover:border-sky-500/70">
                <div className={`mb-4 inline-flex items-center justify-center p-3 rounded-lg ${feature.bgColorClass} shadow-sm`}>
                  <feature.icon className={`w-7 h-7 ${feature.textColorClass}`} />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-100 mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {feature.name}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
                <ArrowRightIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-transform duration-300 group-hover:translate-x-1 absolute bottom-6 right-6" />
              </div>
            </Link>
          ))}
        </div>

        {/* 4. UPDATED: The System Statistics Section */}
        <div className="p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-4">
            <ChartBarIcon className="w-7 h-7 text-amber-600 dark:text-amber-400 mr-3"/>
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-100">System Statistics</h2>
          </div>
          {/* Use a 3-column grid to display the new stats */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargo Passes</p>
              <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{passCounts.cargo}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Landside Passes</p>
              <p className="mt-1 text-3xl font-bold text-purple-600 dark:text-purple-400">{passCounts.landside}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Grand Total Passes</p>
              <p className="mt-1 text-3xl font-bold text-sky-600 dark:text-sky-400">{passCounts.total}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
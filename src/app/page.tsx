// app/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/app/lib/auth";
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import SignOutButton from '@/app/components/SignOutButton'
import SignInButton from '@/app/components/SignInButton';

// Heroicon imports
import { 
  PlusCircleIcon, 
  CircleStackIcon, 
  PrinterIcon, 
  ArrowRightIcon, 
  ChartBarIcon, 
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface PassCounts {
  total: number;
  cargo: number;
  landside: number;
}

interface PassStatistics {
  counts: PassCounts;
  expiringThisMonth: number;
  expiredPasses: number;
  recentlyAdded: number; // Added in last 7 days
  totalOrganizations: number;
  totalCreators: number;
  mostCommonArea: string;
  averagePassesPerDay: number;
}

async function getComprehensiveStatistics(): Promise<PassStatistics> {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const query = `
      {
        "counts": {
          "total": count(*[_type == "employeePass"]),
          "cargo": count(*[_type == "employeePass" && category == "cargo"]),
          "landside": count(*[_type == "employeePass" && category == "landside"])
        },
        "expiringThisMonth": count(*[_type == "employeePass" && dateOfExpiry >= "${startOfMonth.toISOString()}" && dateOfExpiry <= "${endOfMonth.toISOString()}"]),
        "expiredPasses": count(*[_type == "employeePass" && dateOfExpiry < "${today.toISOString()}"]),
        "recentlyAdded": count(*[_type == "employeePass" && _createdAt >= "${sevenDaysAgo.toISOString()}"]),
        "totalOrganizations": count(array::unique(*[_type == "employeePass"].organization)),
        "totalCreators": count(array::unique(*[_type == "employeePass"].author._ref)),
        "allAreas": *[_type == "employeePass"].areaAllowed[],
        "oldestPass": *[_type == "employeePass"] | order(_createdAt asc)[0]._createdAt,
        "newestPass": *[_type == "employeePass"] | order(_createdAt desc)[0]._createdAt
      }
    `;
    
    const result = await client.fetch(query);
    
    // Calculate most common area
    const areaCount: { [key: string]: number } = {};
    if (result.allAreas) {
      result.allAreas.forEach((area: string) => {
        if (area) {
          areaCount[area] = (areaCount[area] || 0) + 1;
        }
      });
    }
    
    const mostCommonArea = Object.keys(areaCount).reduce((a, b) => 
      areaCount[a] > areaCount[b] ? a : b, 'N/A'
    );

    // Calculate average passes per day
    let averagePassesPerDay = 0;
    if (result.oldestPass && result.newestPass) {
      const daysDiff = Math.ceil((new Date(result.newestPass).getTime() - new Date(result.oldestPass).getTime()) / (1000 * 60 * 60 * 24));
      averagePassesPerDay = daysDiff > 0 ? Math.round((result.counts?.total || 0) / daysDiff * 10) / 10 : 0;
    }

    return {
      counts: result.counts || { total: 0, cargo: 0, landside: 0 },
      expiringThisMonth: result.expiringThisMonth || 0,
      expiredPasses: result.expiredPasses || 0,
      recentlyAdded: result.recentlyAdded || 0,
      totalOrganizations: result.totalOrganizations || 0,
      totalCreators: result.totalCreators || 0,
      mostCommonArea: mostCommonArea,
      averagePassesPerDay: averagePassesPerDay
    };
  } catch (error) {
    console.error("Failed to fetch comprehensive statistics from Sanity:", error);
    return {
      counts: { total: 0, cargo: 0, landside: 0 },
      expiringThisMonth: 0,
      expiredPasses: 0,
      recentlyAdded: 0,
      totalOrganizations: 0,
      totalCreators: 0,
      mostCommonArea: 'N/A',
      averagePassesPerDay: 0
    };
  }
}

interface Feature {
  name: string;
  href: string;
  description: string;
  icon: React.ElementType;
  bgColorClass: string;
  textColorClass: string;
  emoji: string;
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

function LoggedOutView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <div className="text-6xl mb-4">✈️</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-sky-400 leading-tight">
            Airport Pass System
          </h1>
        </div>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Secure access management for airport personnel. Please sign in to continue.
        </p>
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

  const statistics = await getComprehensiveStatistics();

  const features: Feature[] = [
    { 
      name: 'Add New Pass', 
      href: '/add-pass',
      description: 'Create a new employee pass record quickly and easily.',
      icon: PlusCircleIcon,
      bgColorClass: 'bg-green-100 dark:bg-green-900/50',
      textColorClass: 'text-green-600 dark:text-green-400',
      emoji: '➕'
    },
    { 
      name: 'Upload Excel', 
      href: '/bulk-add-passes',
      description: 'Bulk import multiple passes from Excel spreadsheet.',
      icon: DocumentArrowUpIcon,
      bgColorClass: 'bg-emerald-100 dark:bg-emerald-900/50',
      textColorClass: 'text-emerald-600 dark:text-emerald-400',
      emoji: '📊'
    },
    { 
      name: 'View Database', 
      href: '/database',
      description: 'Browse, search, and manage all existing passes.',
      icon: CircleStackIcon,
      bgColorClass: 'bg-blue-100 dark:bg-blue-900/50',
      textColorClass: 'text-blue-600 dark:text-blue-400',
      emoji: '🗃️'
    },
    { 
      name: 'Print ID Cards', 
      href: '/print-prev',
      description: 'View gallery and print official identification cards.',
      icon: PrinterIcon,
      bgColorClass: 'bg-purple-100 dark:bg-purple-900/50',
      textColorClass: 'text-purple-600 dark:text-purple-400',
      emoji: '🖨️'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        
        {/* Header Section */}
        <header className="mb-6 sm:mb-8 lg:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-800 dark:text-sky-400 mb-2">
                Airport Pass Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Welcome back, <span className="font-semibold text-sky-600 dark:text-sky-300 break-words">
                  {user.name || user.email?.split('@')[0] || 'User'}
                </span>! 👋
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <div className="sm:hidden mb-4">
                <SignOutButton />
              </div>
              <div className="hidden sm:block">
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Alert Section for Expired/Expiring Passes */}
        {(statistics.expiredPasses > 0 || statistics.expiringThisMonth > 0) && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Pass Expiration Alert
                  </h3>
                  <div className="text-sm text-amber-700 dark:text-amber-400">
                    {statistics.expiredPasses > 0 && (
                      <p className="mb-1">
                        <span className="font-semibold">{statistics.expiredPasses}</span> pass(es) have already expired.
                      </p>
                    )}
                    {statistics.expiringThisMonth > 0 && (
                      <p>
                        <span className="font-semibold">{statistics.expiringThisMonth}</span> pass(es) expiring this month.
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <Link 
                      href="/database?sort=expiry_asc" 
                      className="text-sm text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline"
                    >
                      View expiring passes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.href}
              className="group block transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative h-full p-4 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-sky-500/70 dark:hover:border-sky-500/70 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`inline-flex items-center justify-center p-2 sm:p-3 rounded-lg ${feature.bgColorClass} shadow-sm mr-3`}>
                    <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.textColorClass}`} />
                  </div>
                  <span className="text-2xl sm:hidden">{feature.emoji}</span>
                </div>
                
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-100 mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {feature.name}
                </h2>
                
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>
                
                <div className="flex justify-end">
                  <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-all duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Enhanced Statistics Section */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* Primary Statistics */}
          <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900/50 rounded-lg mr-3 sm:mr-4">
                  <ChartBarIcon className="w-6 h-6 text-amber-600 dark:text-amber-400"/>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-100">
                    Pass Distribution
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Current active passes by category
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Cargo Passes</p>
                    <span className="text-lg">🚛</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {statistics.counts.cargo.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                    {statistics.counts.total > 0 ? Math.round((statistics.counts.cargo / statistics.counts.total) * 100) : 0}% of total
                  </p>
                </div>
                
                <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Landside Passes</p>
                    <span className="text-lg">🏢</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {statistics.counts.landside.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                    {statistics.counts.total > 0 ? Math.round((statistics.counts.landside / statistics.counts.total) * 100) : 0}% of total
                  </p>
                </div>
                
                <div className="p-4 sm:p-5 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-800/30 rounded-lg border border-sky-200 dark:border-sky-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-300">Total Passes</p>
                    <span className="text-lg">📊</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">
                    {statistics.counts.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-sky-600/70 dark:text-sky-400/70 mt-1">
                    Active in system
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity & Status Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg mr-3">
                    <ClockIcon className="w-5 h-5 text-green-600 dark:text-green-400"/>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Recent Activity</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">📝</span>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">New Passes Created</p>
                        <p className="text-xs text-green-600 dark:text-green-400">This week</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {statistics.recentlyAdded}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">⚡</span>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-300">Average Daily</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Passes per day</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {statistics.averagePassesPerDay}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pass Status */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg mr-3">
                    <CalendarDaysIcon className="w-5 h-5 text-red-600 dark:text-red-400"/>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Pass Status</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Expiration tracking</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">❌</span>
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">Expired Passes</p>
                        <p className="text-xs text-red-600 dark:text-red-400">Require renewal</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {statistics.expiredPasses}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">⚠️</span>
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Expiring This Month</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Action needed soon</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {statistics.expiringThisMonth}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organizational Statistics */}
          <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg mr-3 sm:mr-4">
                  <UserGroupIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-100">
                    Organizational Insights
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    System-wide statistics
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg border border-indigo-200 dark:border-indigo-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300">Organizations</p>
                    <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {statistics.totalOrganizations}
                  </p>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                    Registered companies
                  </p>
                </div>
                
                <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-lg border border-cyan-200 dark:border-cyan-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-cyan-700 dark:text-cyan-300">Pass Creators</p>
                    <UserGroupIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {statistics.totalCreators}
                  </p>
                  <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">
                    Active administrators
                  </p>
                </div>
                
                <div className="p-4 sm:p-5 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300">Top Area</p>
                    <MapPinIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400 leading-tight">
                    {statistics.mostCommonArea}
                  </p>
                  <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">
                    Most common access area
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
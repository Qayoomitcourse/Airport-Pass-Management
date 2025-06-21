'use client';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface PassStats {
  totalPasses: number;
  cargoPasses: number;
  landsidePasses: number;
  activePasses: number;
  expiredPasses: number;
  todayCreated: number;
}

interface UserPassStats {
  userId: string;
  userName: string;
  passesCreated: number;
  lastCreated: string;
}

interface RecentActivity {
  id: string;
  action: string;
  passName: string;
  userName: string;
  time: string;
  type: 'created' | 'updated' | 'deleted' | 'expired';
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [passStats, setPassStats] = useState<PassStats>({
    totalPasses: 0,
    cargoPasses: 0,
    landsidePasses: 0,
    activePasses: 0,
    expiredPasses: 0,
    todayCreated: 0
  });
  const [userStats, setUserStats] = useState<UserPassStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch pass statistics
      const statsResponse = await fetch('/api/dashboard/pass-stats');
      const statsData = await statsResponse.json();
      setPassStats(statsData);

      // Fetch user pass creation statistics
      const userStatsResponse = await fetch('/api/dashboard/user-pass-stats');
      const userStatsData = await userStatsResponse.json();
      setUserStats(userStatsData);

      // Fetch recent activity
      const activityResponse = await fetch('/api/dashboard/recent-activity');
      const activityData = await activityResponse.json();
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return '✅';
      case 'updated': return '✏️';
      case 'deleted': return '🗑️';
      case 'expired': return '⏰';
      default: return '📄';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-500/20 text-green-400';
      case 'updated': return 'bg-blue-500/20 text-blue-400';
      case 'deleted': return 'bg-red-500/20 text-red-400';
      case 'expired': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
                Employee Pass Dashboard
              </h1>
              <p className="text-slate-300 text-lg">Welcome back, {session?.user?.name || 'User'}</p>
              <p className="text-slate-400">{formatDate(currentTime)}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-cyan-400 mb-1">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-slate-400">Live Time</div>
            </div>
          </div>
        </div>

        {/* Pass Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[
            { 
              label: 'Total Passes', 
              value: passStats.totalPasses.toLocaleString(), 
              icon: '📋', 
              color: 'from-blue-600 to-blue-800',
              change: `+${passStats.todayCreated} today`
            },
            { 
              label: 'Cargo Passes', 
              value: passStats.cargoPasses.toLocaleString(), 
              icon: '📦', 
              color: 'from-orange-600 to-orange-800',
              change: `${Math.round((passStats.cargoPasses / passStats.totalPasses) * 100)}%`
            },
            { 
              label: 'Landside Passes', 
              value: passStats.landsidePasses.toLocaleString(), 
              icon: '🏢', 
              color: 'from-green-600 to-green-800',
              change: `${Math.round((passStats.landsidePasses / passStats.totalPasses) * 100)}%`
            },
            { 
              label: 'Active Passes', 
              value: passStats.activePasses.toLocaleString(), 
              icon: '✅', 
              color: 'from-emerald-600 to-emerald-800',
              change: 'Valid'
            },
            { 
              label: 'Expired Passes', 
              value: passStats.expiredPasses.toLocaleString(), 
              icon: '⏰', 
              color: 'from-red-600 to-red-800',
              change: 'Need Renewal'
            },
            { 
              label: 'Today Created', 
              value: passStats.todayCreated.toLocaleString(), 
              icon: '🆕', 
              color: 'from-purple-600 to-purple-800',
              change: 'New'
            }
          ].map((stat, index) => (
            <div
              key={index}
              className="group relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{stat.icon}</div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${stat.color} text-white`}>
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-slate-300 text-sm">{stat.label}</div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Pass Activity */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
              Recent Pass Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      Pass {activity.action} for <span className="text-cyan-400">{activity.passName}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      by {activity.userName} • {activity.time}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-400 hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-4">📄</div>
                  <p>No recent activity found</p>
                </div>
              )}
            </div>
          </div>

          {/* User Pass Creation Statistics */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-6">Top Pass Creators</h2>
              <div className="space-y-4">
                {userStats.length > 0 ? userStats.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.userName}</div>
                      <div className="text-xs text-slate-400">
                        Last: {user.lastCreated}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-400">{user.passesCreated}</div>
                      <div className="text-xs text-slate-400">passes</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400">
                    <p>No user statistics available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold mb-6">Pass Management</h2>
              <div className="space-y-3">
                {[
                  { label: 'Create New Pass', icon: '➕', color: 'hover:bg-blue-500/20', href: '/add-pass' },
                  { label: 'View All Passes', icon: '📋', color: 'hover:bg-green-500/20', href: '/database' },
                  { label: 'Bulk Add Passes', icon: '📤', color: 'hover:bg-purple-500/20', href: '/bulk-add-passes' },
                  { label: 'Export Database', icon: '💾', color: 'hover:bg-orange-500/20', href: '#' }
                ].map((action, index) => (
                  <button
                    key={index}
                    className={`w-full flex items-center p-3 rounded-xl bg-white/5 ${action.color} transition-all duration-200 hover:scale-105 group`}
                    onClick={() => action.href !== '#' && (window.location.href = action.href)}
                  >
                    <span className="text-xl mr-3">{action.icon}</span>
                    <span className="font-medium">{action.label}</span>
                    <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400">
          <p>Dashboard last updated: {currentTime.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
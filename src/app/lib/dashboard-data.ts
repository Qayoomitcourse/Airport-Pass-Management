import { EmployeePass } from '@/app/types';
import { isAfter, isToday, parseISO } from 'date-fns';

// Define the structure for our calculated stats
export interface DashboardStats {
  totalPasses: number;
  activePasses: number;
  expiredPasses: number;
  todayCreated: number;
}

// --- FIX: The 'RecentPass' interface has been completely removed. ---
// It was empty and not needed. We will use 'EmployeePass' directly.

// Define the return type for our main function
export interface DashboardData {
  stats: DashboardStats;
  // Use EmployeePass[] directly here
  recentActivity: EmployeePass[];
}

// The main function to fetch and process all data for the dashboard
export async function getDashboardData(): Promise<DashboardData> {
  // Fetch all passes from your existing API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : 'http://localhost:3000';
  
  const response = await fetch(`${baseUrl}/api/get-passes`, {
    cache: 'no-store', // Always get the latest data for the dashboard
  });

  if (!response.ok) {
    throw new Error('Failed to fetch pass data for the dashboard.');
  }

  const passes: EmployeePass[] = await response.json();
  const now = new Date();

  // --- Calculate Statistics ---
  let activePasses = 0;
  let expiredPasses = 0;
  let todayCreated = 0;

  passes.forEach(pass => {
    try {
      const expiryDate = parseISO(pass.dateOfExpiry);
      const entryDate = parseISO(pass.dateOfEntry);

      // Check expiry status
      if (isAfter(expiryDate, now)) {
        activePasses++;
      } else {
        expiredPasses++;
      }

      // Check if created today
      if (isToday(entryDate)) {
        todayCreated++;
      }
    } catch (e) {
      console.error(`Could not parse dates for pass ID ${pass.passId}`, e);
    }
  });

  const stats: DashboardStats = {
    totalPasses: passes.length,
    activePasses,
    expiredPasses,
    todayCreated,
  };

  // --- Get Recent Activity ---
  const sortedPasses = [...passes].sort((a, b) => 
    new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime()
  );
  
  // recentActivity is now correctly typed as EmployeePass[]
  const recentActivity: EmployeePass[] = sortedPasses.slice(0, 5);

  return { stats, recentActivity };
}
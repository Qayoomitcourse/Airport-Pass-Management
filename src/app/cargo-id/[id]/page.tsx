'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { urlFor } from '@/sanity/lib/image';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';

// Extended type for employee details with optional properties
interface EmployeeDetailsType {
  _id: string;
  _createdAt?: string;
  _updatedAt?: string;
  name: string;
  cnic?: string;
  designation: string;
  organization: string;
  passId?: number;
  category: string;
  photo?: string | SanityImageSource;
  dateOfEntry?: string;
  dateOfExpiry?: string;
  areaAllowed?: string[];
  status?: string;
  author?: {
    _ref?: string;
    name?: string;
  };
}

function getImageUrl(photo: string | SanityImageSource | null | undefined): string {
  if (!photo || (typeof photo === 'object' && !('asset' in photo))) {
    return PLACEHOLDER_AVATAR_URL;
  }
  try {
    return urlFor(photo).width(400).height(400).fit('crop').url();
  } catch {
    return PLACEHOLDER_AVATAR_URL;
  }
}

function formatDateSafely(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  try {
    return format(date, 'dd MMMM yyyy');
  } catch {
    return 'Format Error';
  }
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent absolute top-0"></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading employee details...</p>
      </div>
    </div>
  );
}

function ErrorMessage({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-medium"
            >
              Try Again
            </button>
            <Link
              href="/database"
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 transform hover:scale-105 font-medium"
            >
              Back to Database
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, expiryDate }: { status?: string; expiryDate?: string | null }) {
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
  const actualStatus = isExpired ? 'expired' : (status || 'active');
  
  const statusConfig = {
    active: { 
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500', 
      text: 'text-white',
      icon: '✓'
    },
    expired: { 
      bg: 'bg-gradient-to-r from-red-500 to-rose-500', 
      text: 'text-white',
      icon: '⚠'
    },
    pending: { 
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500', 
      text: 'text-white',
      icon: '⏳'
    },
    suspended: { 
      bg: 'bg-gradient-to-r from-gray-500 to-slate-500', 
      text: 'text-white',
      icon: '⏸'
    }
  };

  const config = statusConfig[actualStatus as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className={`${config.bg} px-4 py-2 rounded-full shadow-lg flex items-center space-x-2`}>
      <span className="text-sm">{config.icon}</span>
      <span className={`font-semibold text-sm ${config.text}`}>
        {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
      </span>
    </div>
  );
}

function ExpiryDateBadge({ expiryDate }: { expiryDate?: string | null }) {
  if (!expiryDate) return null;
  
  const isExpired = new Date(expiryDate) < new Date();
  const formattedDate = formatDateSafely(expiryDate);
  
  if (formattedDate === 'N/A' || formattedDate === 'Invalid Date') return null;
  
  return (
    <div className={`px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 ${
      isExpired 
        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' 
        : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
    }`}>
      <span className="text-sm">{isExpired ? '⚠️' : '📅'}</span>
      <span className="font-semibold text-sm">
        {isExpired ? 'Expired: ' : 'Expires: '}{formattedDate}
      </span>
    </div>
  );
}

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center space-x-3">
          <div className="text-white text-xl">{icon}</div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="group">
      <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <p className={`text-lg text-gray-900 group-hover:text-blue-600 transition-colors ${mono ? 'font-mono bg-gray-50 px-3 py-1 rounded-lg border' : ''}`}>
        {value}
      </p>
    </div>
  );
}

export default function EmployeeDetailsPage() {
  // --- FIX IS HERE ---
  // Removed `data: session` because it was not being used.
  // We only need `status` to check if the user is logged in.
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [employee, setEmployee] = useState<EmployeeDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = params.id as string;
  const isCargoPage = pathname.includes('/cargo-id/');
  const pageType = isCargoPage ? 'cargo' : 'landside';

  const fetchEmployeeDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-pass-details?id=${employeeId}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee details: ${response.status}`);
      }
      
      const data = await response.json();
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/');
      return;
    }
    
    if (sessionStatus === 'authenticated' && employeeId) {
      fetchEmployeeDetails();
    }
  }, [sessionStatus, employeeId, router, fetchEmployeeDetails]);

  if (sessionStatus === 'loading' || loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchEmployeeDetails} />;
  }

  if (!employee) {
    return <ErrorMessage error="Employee not found" onRetry={fetchEmployeeDetails} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/database" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 group">
              <div className="bg-blue-100 rounded-full p-2 mr-3 group-hover:bg-blue-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="font-medium">Back to Database</span>
            </Link>
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Employee Pass Details</h1>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-semibold">
                    {pageType.charAt(0).toUpperCase() + pageType.slice(1)} Pass
                  </span>
                  <span className="text-gray-600 font-mono text-lg">
                    #{String(employee.passId || employee._id).padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Card - Employee Photo and Basic Info */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-8 py-12 relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-12 translate-y-12"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-12">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Image
                      src={getImageUrl(employee.photo)}
                      alt={`${employee.name}'s photo`}
                      width={180}
                      height={180}
                      className="rounded-3xl border-4 border-white shadow-2xl object-cover"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-white text-center lg:text-left flex-1">
                  <h2 className="text-5xl font-bold mb-3 leading-tight">{employee.name}</h2>
                  <p className="text-2xl font-medium text-blue-100 mb-2">{employee.designation}</p>
                  <p className="text-xl text-blue-200 mb-6">{employee.organization}</p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                    <StatusBadge status={employee.status} expiryDate={employee.dateOfExpiry} />
                    <ExpiryDateBadge expiryDate={employee.dateOfExpiry} />
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <span className="font-semibold text-sm">
                        🎫 {employee.category?.charAt(0).toUpperCase() + employee.category?.slice(1)} Access
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Personal Information */}
            <InfoCard 
              title="Personal Information" 
              icon={<span>👤</span>}
            >
              <div className="space-y-6">
                <InfoField label="Full Name" value={employee.name} />
                <InfoField label="CNIC Number" value={employee.cnic || 'N/A'} mono />
              </div>
            </InfoCard>

            {/* Employment Information */}
            <InfoCard 
              title="Employment Details" 
              icon={<span>💼</span>}
            >
              <div className="space-y-6">
                <InfoField label="Designation" value={employee.designation} />
                <InfoField label="Organization" value={employee.organization} />
                <InfoField label="Employee ID" value={employee.passId?.toString() || 'N/A'} mono />
              </div>
            </InfoCard>

            {/* Pass Information */}
            <InfoCard 
              title="Pass Information" 
              icon={<span>🎫</span>}
            >
              <div className="space-y-6">
                <InfoField 
                  label="Pass ID" 
                  value={String(employee.passId || employee._id).padStart(4, '0')} 
                  mono 
                />
                <InfoField label="Pass Type" value={employee.category?.toUpperCase() || 'N/A'} />
                <InfoField label="Date of Entry" value={formatDateSafely(employee.dateOfEntry)} />
                <InfoField label="Date of Expiry" value={formatDateSafely(employee.dateOfExpiry)} />
              </div>
            </InfoCard>

            {/* Access Information */}
            <InfoCard 
              title="Access Permissions" 
              icon={<span>🔐</span>}
            >
              <div>
                <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Authorized Areas
                </label>
                {employee.areaAllowed && employee.areaAllowed.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {employee.areaAllowed.map((area, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-shadow duration-200"
                      >
                        📍 {area}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-gray-500 font-medium">No specific areas assigned</p>
                    <p className="text-sm text-gray-400 mt-1">Contact administrator for area permissions</p>
                  </div>
                )}
              </div>
            </InfoCard>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-gray-500 to-slate-500 text-white rounded-lg p-2">
                <span className="text-lg">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">System Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <label className="block text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">
                  Created By
                </label>
                <p className="text-gray-900 font-medium">{employee.author?.name || 'System'}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <label className="block text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">
                  Created Date
                </label>
                <p className="text-gray-900 font-medium">{formatDateSafely(employee._createdAt)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                <label className="block text-sm font-semibold text-purple-600 uppercase tracking-wide mb-2">
                  Last Updated
                </label>
                <p className="text-gray-900 font-medium">{formatDateSafely(employee._updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}